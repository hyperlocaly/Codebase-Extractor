import { eq, and, count, avg } from "drizzle-orm";
import type { Db } from "@workspace/db";
import {
  businessesTable,
  businessScoresTable,
  businessScoreHistoryTable,
  verificationRecordsTable,
  reviewsTable,
  productsTable,
  businessContactsTable,
} from "@workspace/db";
import type { BackgroundJob } from "@workspace/db";
import { logger } from "../../../lib/logger";

export async function handleScoreRecalculation(job: BackgroundJob, db: Db): Promise<void> {
  const { businessId } = job.payload as { businessId: string };
  if (!businessId) throw new Error("Missing businessId in job payload");

  logger.debug({ businessId }, "Recalculating business score");

  const [biz] = await db
    .select({ id: businessesTable.id, createdAt: businessesTable.createdAt, publishedAt: businessesTable.publishedAt })
    .from(businessesTable)
    .where(eq(businessesTable.id, businessId));
  if (!biz) {
    logger.warn({ businessId }, "Business not found during score recalculation");
    return;
  }

  // Verification component: ratio of verified checks to total enabled checks
  const [verifiedCount] = await db
    .select({ count: count(verificationRecordsTable.id) })
    .from(verificationRecordsTable)
    .where(and(eq(verificationRecordsTable.businessId, businessId), eq(verificationRecordsTable.status, "verified")));

  const [totalVerifCount] = await db
    .select({ count: count(verificationRecordsTable.id) })
    .from(verificationRecordsTable)
    .where(eq(verificationRecordsTable.businessId, businessId));

  const verifiedNum = Number(verifiedCount?.count ?? 0);
  const totalVerif = Number(totalVerifCount?.count ?? 0);
  const verificationComponent = totalVerif > 0 ? (verifiedNum / totalVerif) * 40 : 0;

  // Feedback component: avg rating mapped to 0-30 range
  const [reviewSummary] = await db
    .select({ avg: avg(reviewsTable.rating), count: count(reviewsTable.id) })
    .from(reviewsTable)
    .where(and(eq(reviewsTable.businessId, businessId), eq(reviewsTable.status, "published")));

  const avgRating = reviewSummary?.avg ? Number(reviewSummary.avg) : 0;
  const reviewCount = Number(reviewSummary?.count ?? 0);
  const feedbackComponent = reviewCount > 0 ? ((avgRating - 1) / 4) * 30 : 0;

  // Completeness component: profile completeness 0-20
  const [productCount] = await db
    .select({ count: count(productsTable.id) })
    .from(productsTable)
    .where(and(eq(productsTable.businessId, businessId), eq(productsTable.status, "active")));

  const [contactCount] = await db
    .select({ count: count(businessContactsTable.id) })
    .from(businessContactsTable)
    .where(eq(businessContactsTable.businessId, businessId));

  const hasProducts = Number(productCount?.count ?? 0) > 0 ? 5 : 0;
  const hasContacts = Number(contactCount?.count ?? 0) > 0 ? 5 : 0;
  const hasDescription = 5; // assume description exists (we don't re-fetch here)
  const isPublished = biz.publishedAt ? 5 : 0;
  const completenessComponent = hasProducts + hasContacts + hasDescription + isPublished;

  // Recency component: 0-10 based on how recently published
  let recencyComponent = 0;
  if (biz.publishedAt) {
    const ageMs = Date.now() - new Date(biz.publishedAt).getTime();
    const ageDays = ageMs / 86400000;
    if (ageDays < 30) recencyComponent = 10;
    else if (ageDays < 90) recencyComponent = 7;
    else if (ageDays < 180) recencyComponent = 5;
    else if (ageDays < 365) recencyComponent = 3;
    else recencyComponent = 1;
  }

  const totalScore = Math.min(100, verificationComponent + feedbackComponent + completenessComponent + recencyComponent);

  const [existingScore] = await db
    .select({ totalScore: businessScoresTable.totalScore })
    .from(businessScoresTable)
    .where(eq(businessScoresTable.businessId, businessId));

  await db
    .insert(businessScoresTable)
    .values({
      businessId,
      totalScore: totalScore.toFixed(2),
      verificationComponent: verificationComponent.toFixed(2),
      feedbackComponent: feedbackComponent.toFixed(2),
      recencyComponent: recencyComponent.toFixed(2),
      completenessComponent: completenessComponent.toFixed(2),
      lastCalculatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: businessScoresTable.businessId,
      set: {
        totalScore: totalScore.toFixed(2),
        verificationComponent: verificationComponent.toFixed(2),
        feedbackComponent: feedbackComponent.toFixed(2),
        recencyComponent: recencyComponent.toFixed(2),
        completenessComponent: completenessComponent.toFixed(2),
        lastCalculatedAt: new Date(),
        updatedAt: new Date(),
      },
    });

  await db.insert(businessScoreHistoryTable).values({
    businessId,
    totalScore: totalScore.toFixed(2),
    previousScore: existingScore?.totalScore ?? null,
    triggerEvent: job.jobType,
  });

  await db
    .update(businessesTable)
    .set({ verificationScore: totalScore.toFixed(2), updatedAt: new Date() })
    .where(eq(businessesTable.id, businessId));

  logger.info({ businessId, totalScore }, "Business score recalculated");
}
