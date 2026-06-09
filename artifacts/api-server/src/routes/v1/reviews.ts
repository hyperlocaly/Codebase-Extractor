import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { eq, and, isNull, desc, avg, count } from "drizzle-orm";
import { db } from "@workspace/db";
import { reviewsTable, businessesTable } from "@workspace/db";
import { requireAuth } from "../../middleware/auth";
import { requireMarketplace } from "../../middleware/marketplace-context";
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from "../../shared/response";
import { parsePagination, buildNextCursor } from "../../shared/pagination";
import { NotFoundError, ValidationError, ForbiddenError, ConflictError } from "../../shared/errors";
import { publishEvent } from "../../infrastructure/outbox/publisher";

const router: IRouter = Router();

const CreateReviewSchema = z.object({
  businessId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional(),
  body: z.string().max(3000).optional(),
  isAnonymous: z.boolean().default(false),
});

const UpdateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().max(200).optional(),
  body: z.string().max(3000).optional(),
});

router.get("/", requireMarketplace, async (req, res, next): Promise<void> => {
  try {
    const { businessId, limit: rawLimit, cursor: rawCursor } = req.query as Record<string, string | undefined>;
    const marketplace = req.marketplace!;
    const { limit } = parsePagination(rawLimit, rawCursor);

    if (!businessId) return next(new ValidationError("businessId query param is required"));

    const rows = await db
      .select({
        id: reviewsTable.id,
        businessId: reviewsTable.businessId,
        rating: reviewsTable.rating,
        title: reviewsTable.title,
        body: reviewsTable.body,
        isAnonymous: reviewsTable.isAnonymous,
        status: reviewsTable.status,
        moderationStatus: reviewsTable.moderationStatus,
        reviewerId: reviewsTable.reviewerId,
        createdAt: reviewsTable.createdAt,
      })
      .from(reviewsTable)
      .where(
        and(
          eq(reviewsTable.marketplaceId, marketplace.id),
          eq(reviewsTable.businessId, businessId),
          isNull(reviewsTable.deletedAt),
          eq(reviewsTable.status, "published"),
          eq(reviewsTable.moderationStatus, "auto_approved"),
        ),
      )
      .orderBy(desc(reviewsTable.createdAt))
      .limit(limit + 1);

    sendPaginated(res, rows.slice(0, limit), buildNextCursor(rows, limit));
  } catch (err) {
    next(err);
  }
});

router.get("/summary", requireMarketplace, async (req, res, next): Promise<void> => {
  try {
    const { businessId } = req.query as { businessId?: string };
    if (!businessId) return next(new ValidationError("businessId is required"));
    const marketplace = req.marketplace!;

    const [summary] = await db
      .select({ avgRating: avg(reviewsTable.rating), totalCount: count(reviewsTable.id) })
      .from(reviewsTable)
      .where(
        and(
          eq(reviewsTable.marketplaceId, marketplace.id),
          eq(reviewsTable.businessId, businessId),
          isNull(reviewsTable.deletedAt),
          eq(reviewsTable.status, "published"),
        ),
      );

    const distribution = await db
      .select({ rating: reviewsTable.rating, count: count(reviewsTable.id) })
      .from(reviewsTable)
      .where(
        and(
          eq(reviewsTable.marketplaceId, marketplace.id),
          eq(reviewsTable.businessId, businessId),
          isNull(reviewsTable.deletedAt),
          eq(reviewsTable.status, "published"),
        ),
      )
      .groupBy(reviewsTable.rating)
      .orderBy(reviewsTable.rating);

    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const row of distribution) dist[row.rating] = Number(row.count);

    sendSuccess(res, {
      businessId,
      avgRating: summary?.avgRating ? Number(Number(summary.avgRating).toFixed(2)) : null,
      totalCount: Number(summary?.totalCount ?? 0),
      distribution: dist,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/", requireAuth, requireMarketplace, async (req, res, next): Promise<void> => {
  try {
    const marketplace = req.marketplace!;
    const user = req.user!;

    const body = CreateReviewSchema.safeParse(req.body);
    if (!body.success) return next(new ValidationError("Invalid input", body.error.flatten()));

    const [biz] = await db
      .select({ id: businessesTable.id })
      .from(businessesTable)
      .where(
        and(
          eq(businessesTable.id, body.data.businessId),
          eq(businessesTable.marketplaceId, marketplace.id),
          isNull(businessesTable.deletedAt),
        ),
      );
    if (!biz) return next(new NotFoundError("Business", body.data.businessId));

    const [existing] = await db
      .select({ id: reviewsTable.id })
      .from(reviewsTable)
      .where(
        and(
          eq(reviewsTable.reviewerId, user.id),
          eq(reviewsTable.businessId, body.data.businessId),
          isNull(reviewsTable.deletedAt),
        ),
      );
    if (existing) return next(new ConflictError("You have already reviewed this business"));

    const [review] = await db
      .insert(reviewsTable)
      .values({
        marketplaceId: marketplace.id,
        businessId: body.data.businessId,
        reviewerId: user.id,
        rating: body.data.rating,
        title: body.data.title ?? null,
        body: body.data.body ?? null,
        isAnonymous: body.data.isAnonymous,
        status: "published",
        moderationStatus: "auto_approved",
      })
      .returning();

    await publishEvent(db, {
      eventType: "ReviewSubmitted",
      aggregateType: "review",
      aggregateId: review!.id,
      payload: { reviewId: review!.id, businessId: body.data.businessId, rating: body.data.rating, marketplaceId: marketplace.id, reviewerId: user.id },
    });

    sendCreated(res, review);
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", requireAuth, requireMarketplace, async (req, res, next): Promise<void> => {
  try {
    const id = String(req.params["id"]);
    const user = req.user!;

    const [review] = await db.select().from(reviewsTable).where(and(eq(reviewsTable.id, id), isNull(reviewsTable.deletedAt)));
    if (!review) return next(new NotFoundError("Review", id));
    if (review.reviewerId !== user.id) return next(new ForbiddenError("Cannot edit another user's review"));

    const body = UpdateReviewSchema.safeParse(req.body);
    if (!body.success) return next(new ValidationError("Invalid input", body.error.flatten()));

    const [updated] = await db
      .update(reviewsTable)
      .set({ ...body.data, updatedAt: new Date() })
      .where(eq(reviewsTable.id, id))
      .returning();

    sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", requireAuth, requireMarketplace, async (req, res, next): Promise<void> => {
  try {
    const id = String(req.params["id"]);
    const user = req.user!;

    const [review] = await db.select().from(reviewsTable).where(and(eq(reviewsTable.id, id), isNull(reviewsTable.deletedAt)));
    if (!review) return next(new NotFoundError("Review", id));
    if (review.reviewerId !== user.id) return next(new ForbiddenError("Cannot delete another user's review"));

    await db.update(reviewsTable).set({ deletedAt: new Date() }).where(eq(reviewsTable.id, id));

    sendNoContent(res);
  } catch (err) {
    next(err);
  }
});

export default router;
