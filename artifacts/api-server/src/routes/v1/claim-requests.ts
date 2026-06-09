import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { eq, and, isNull, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import { claimRequestsTable, businessesTable } from "@workspace/db";
import { requireAuth } from "../../middleware/auth";
import { requireMarketplace } from "../../middleware/marketplace-context";
import { sendSuccess, sendCreated, sendPaginated } from "../../shared/response";
import { parsePagination, buildNextCursor } from "../../shared/pagination";
import { NotFoundError, ValidationError, ConflictError } from "../../shared/errors";
import { publishEvent } from "../../infrastructure/outbox/publisher";

const router: IRouter = Router();

const ClaimSchema = z.object({
  businessId: z.string().uuid(),
  evidenceUrl: z.url().optional(),
});

router.get("/", requireAuth, requireMarketplace, async (req, res, next): Promise<void> => {
  try {
    const user = req.user!;
    const marketplace = req.marketplace!;
    const { limit: rawLimit, cursor: rawCursor } = req.query as Record<string, string | undefined>;
    const { limit } = parsePagination(rawLimit, rawCursor);

    const rows = await db
      .select({
        id: claimRequestsTable.id,
        status: claimRequestsTable.status,
        evidenceUrl: claimRequestsTable.evidenceUrl,
        adminNote: claimRequestsTable.adminNote,
        reviewedAt: claimRequestsTable.reviewedAt,
        createdAt: claimRequestsTable.createdAt,
        business: { id: businessesTable.id, name: businessesTable.name, slug: businessesTable.slug },
      })
      .from(claimRequestsTable)
      .innerJoin(businessesTable, eq(claimRequestsTable.businessId, businessesTable.id))
      .where(
        and(
          eq(claimRequestsTable.userId, user.id),
          eq(businessesTable.marketplaceId, marketplace.id),
        ),
      )
      .orderBy(desc(claimRequestsTable.createdAt))
      .limit(limit + 1);

    sendPaginated(res, rows.slice(0, limit), buildNextCursor(rows, limit));
  } catch (err) {
    next(err);
  }
});

router.post("/", requireAuth, requireMarketplace, async (req, res, next): Promise<void> => {
  try {
    const user = req.user!;
    const marketplace = req.marketplace!;

    const body = ClaimSchema.safeParse(req.body);
    if (!body.success) return next(new ValidationError("Invalid input", body.error.flatten()));

    const [biz] = await db
      .select({ id: businessesTable.id, claimStatus: businessesTable.claimStatus })
      .from(businessesTable)
      .where(
        and(
          eq(businessesTable.id, body.data.businessId),
          eq(businessesTable.marketplaceId, marketplace.id),
          isNull(businessesTable.deletedAt),
        ),
      );
    if (!biz) return next(new NotFoundError("Business", body.data.businessId));
    if (biz.claimStatus === "claimed") return next(new ConflictError("This business has already been claimed"));

    const [existing] = await db
      .select({ id: claimRequestsTable.id })
      .from(claimRequestsTable)
      .where(
        and(
          eq(claimRequestsTable.businessId, body.data.businessId),
          eq(claimRequestsTable.userId, user.id),
          eq(claimRequestsTable.status, "pending"),
        ),
      );
    if (existing) return next(new ConflictError("You already have a pending claim request for this business"));

    const [claim] = await db
      .insert(claimRequestsTable)
      .values({
        businessId: body.data.businessId,
        userId: user.id,
        evidenceUrl: body.data.evidenceUrl ?? null,
      })
      .returning();

    await publishEvent(db, {
      eventType: "ClaimRequestSubmitted",
      aggregateType: "claim_request",
      aggregateId: claim!.id,
      payload: { claimId: claim!.id, businessId: body.data.businessId, userId: user.id, marketplaceId: marketplace.id },
    });

    sendCreated(res, claim);
  } catch (err) {
    next(err);
  }
});

export default router;
