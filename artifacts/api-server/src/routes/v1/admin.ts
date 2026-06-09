import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { eq, and, isNull, desc, ilike, count, avg, sql, gte, lte } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  businessesTable,
  claimRequestsTable,
  reviewsTable,
  usersTable,
  businessOwnersTable,
  notificationsTable,
  moderationActionsTable,
  auditLogsTable,
  searchLogsTable,
  engagementEventsTable,
} from "@workspace/db";
import { requireAuth } from "../../middleware/auth";
import { requireMarketplace } from "../../middleware/marketplace-context";
import { requirePermission, requireAnyPermission } from "../../middleware/rbac";
import { sendSuccess, sendPaginated } from "../../shared/response";
import { parsePagination, buildNextCursor } from "../../shared/pagination";
import { NotFoundError, ValidationError } from "../../shared/errors";
import { publishEvent } from "../../infrastructure/outbox/publisher";

const router: IRouter = Router();

// ── Business Moderation ────────────────────────────────────────────────────────

router.get(
  "/businesses",
  requireAuth,
  requireMarketplace,
  requireAnyPermission(["analytics:read:marketplace", "claim:review", "review:moderate"]),
  async (req, res, next): Promise<void> => {
    try {
      const marketplace = req.marketplace!;
      const { status, q, limit: rawLimit, cursor: rawCursor } = req.query as Record<string, string | undefined>;
      const { limit } = parsePagination(rawLimit, rawCursor);

      const conditions: any[] = [
        eq(businessesTable.marketplaceId, marketplace.id),
        isNull(businessesTable.deletedAt),
      ];
      if (status) conditions.push(eq(businessesTable.status, status));
      if (q) conditions.push(ilike(businessesTable.name, `%${q}%`));

      const rows = await db
        .select({
          id: businessesTable.id,
          name: businessesTable.name,
          slug: businessesTable.slug,
          status: businessesTable.status,
          claimStatus: businessesTable.claimStatus,
          verificationScore: businessesTable.verificationScore,
          publishedAt: businessesTable.publishedAt,
          createdAt: businessesTable.createdAt,
        })
        .from(businessesTable)
        .where(and(...conditions))
        .orderBy(desc(businessesTable.createdAt))
        .limit(limit + 1);

      sendPaginated(res, rows.slice(0, limit), buildNextCursor(rows, limit));
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  "/businesses/:id/status",
  requireAuth,
  requireMarketplace,
  requirePermission("business:publish"),
  async (req, res, next): Promise<void> => {
    try {
      const id = String(req.params["id"]);
      const marketplace = req.marketplace!;
      const user = req.user!;

      const { status, reason } = z
        .object({
          status: z.enum(["draft", "active", "suspended", "archived"]),
          reason: z.string().max(500).optional(),
        })
        .parse(req.body);

      const [biz] = await db
        .select({ id: businessesTable.id, status: businessesTable.status })
        .from(businessesTable)
        .where(
          and(
            eq(businessesTable.id, id),
            eq(businessesTable.marketplaceId, marketplace.id),
            isNull(businessesTable.deletedAt),
          ),
        );
      if (!biz) return next(new NotFoundError("Business", id));

      const updateData: Record<string, unknown> = { status, updatedAt: new Date() };
      if (status === "active") updateData["publishedAt"] = new Date();

      const [updated] = await db
        .update(businessesTable)
        .set(updateData as any)
        .where(eq(businessesTable.id, id))
        .returning();

      await db.insert(moderationActionsTable).values({
        entityType: "business",
        entityId: id,
        oldStatus: biz.status,
        newStatus: status,
        reason: reason ?? null,
        actorId: user.id,
      });

      await publishEvent(db, {
        eventType: status === "active" ? "BusinessPublished" : "BusinessSuspended",
        aggregateType: "business",
        aggregateId: id,
        payload: { businessId: id, status, reason, actorId: user.id, marketplaceId: marketplace.id },
      });

      sendSuccess(res, updated);
    } catch (err) {
      next(err);
    }
  },
);

// ── Claim Requests ─────────────────────────────────────────────────────────────

router.get(
  "/claim-requests",
  requireAuth,
  requireMarketplace,
  requirePermission("claim:review"),
  async (req, res, next): Promise<void> => {
    try {
      const marketplace = req.marketplace!;
      const { status, limit: rawLimit, cursor: rawCursor } = req.query as Record<string, string | undefined>;
      const { limit } = parsePagination(rawLimit, rawCursor);

      const rows = await db
        .select({
          id: claimRequestsTable.id,
          status: claimRequestsTable.status,
          evidenceUrl: claimRequestsTable.evidenceUrl,
          adminNote: claimRequestsTable.adminNote,
          createdAt: claimRequestsTable.createdAt,
          business: { id: businessesTable.id, name: businessesTable.name, slug: businessesTable.slug },
          user: { id: usersTable.id, email: usersTable.email, displayName: usersTable.displayName },
        })
        .from(claimRequestsTable)
        .innerJoin(businessesTable, eq(claimRequestsTable.businessId, businessesTable.id))
        .innerJoin(usersTable, eq(claimRequestsTable.userId, usersTable.id))
        .where(
          and(
            eq(businessesTable.marketplaceId, marketplace.id),
            status ? eq(claimRequestsTable.status, status) : undefined,
          ),
        )
        .orderBy(desc(claimRequestsTable.createdAt))
        .limit(limit + 1);

      sendPaginated(res, rows.slice(0, limit), buildNextCursor(rows, limit));
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  "/claim-requests/:id",
  requireAuth,
  requireMarketplace,
  requirePermission("claim:review"),
  async (req, res, next): Promise<void> => {
    try {
      const id = String(req.params["id"]);
      const user = req.user!;

      const { status, adminNote } = z
        .object({
          status: z.enum(["approved", "rejected"]),
          adminNote: z.string().max(1000).optional(),
        })
        .parse(req.body);

      const [claim] = await db.select().from(claimRequestsTable).where(eq(claimRequestsTable.id, id));
      if (!claim) return next(new NotFoundError("Claim request", id));
      if (claim.status !== "pending") return next(new ValidationError("Claim is already resolved"));

      const [updated] = await db
        .update(claimRequestsTable)
        .set({ status, adminNote: adminNote ?? null, reviewedBy: user.id, reviewedAt: new Date(), updatedAt: new Date() })
        .where(eq(claimRequestsTable.id, id))
        .returning();

      if (status === "approved") {
        await db
          .update(businessesTable)
          .set({ claimStatus: "claimed", status: "active", publishedAt: new Date(), updatedAt: new Date() })
          .where(eq(businessesTable.id, claim.businessId));
        await db
          .insert(businessOwnersTable)
          .values({ businessId: claim.businessId, userId: claim.userId, role: "owner" })
          .onConflictDoNothing();

        await db.insert(notificationsTable).values({
          userId: claim.userId,
          type: "claim_approved",
          title: "Claim Approved",
          body: "Your business claim has been approved. You can now manage your business.",
          channel: "in_app",
          status: "pending",
          entityType: "claim_request",
          entityId: claim.id,
        });

        await publishEvent(db, {
          eventType: "ClaimApproved",
          aggregateType: "claim_request",
          aggregateId: claim.id,
          payload: { claimId: claim.id, businessId: claim.businessId, userId: claim.userId, reviewedBy: user.id },
        });
      } else {
        await db.insert(notificationsTable).values({
          userId: claim.userId,
          type: "claim_rejected",
          title: "Claim Rejected",
          body: adminNote ?? "Your business claim has been reviewed and rejected.",
          channel: "in_app",
          status: "pending",
          entityType: "claim_request",
          entityId: claim.id,
        });

        await publishEvent(db, {
          eventType: "ClaimRejected",
          aggregateType: "claim_request",
          aggregateId: claim.id,
          payload: { claimId: claim.id, businessId: claim.businessId, userId: claim.userId, reviewedBy: user.id, adminNote },
        });
      }

      sendSuccess(res, updated);
    } catch (err) {
      next(err);
    }
  },
);

// ── Review Moderation ──────────────────────────────────────────────────────────

router.patch(
  "/reviews/:id/moderation",
  requireAuth,
  requireMarketplace,
  requirePermission("review:moderate"),
  async (req, res, next): Promise<void> => {
    try {
      const id = String(req.params["id"]);
      const user = req.user!;

      const { moderationStatus, moderationNote } = z
        .object({
          moderationStatus: z.enum(["auto_approved", "flagged", "removed"]),
          moderationNote: z.string().max(500).optional(),
        })
        .parse(req.body);

      const updateStatus = moderationStatus === "removed" ? "hidden" : "published";

      const [existing] = await db.select({ status: reviewsTable.status }).from(reviewsTable).where(eq(reviewsTable.id, id));
      if (!existing) return next(new NotFoundError("Review", id));

      const [updated] = await db
        .update(reviewsTable)
        .set({ moderationStatus, moderationNote: moderationNote ?? null, status: updateStatus, updatedAt: new Date() })
        .where(eq(reviewsTable.id, id))
        .returning();

      await db.insert(moderationActionsTable).values({
        entityType: "review",
        entityId: id,
        oldStatus: existing.status,
        newStatus: updateStatus,
        reason: moderationNote ?? null,
        actorId: user.id,
      });

      await publishEvent(db, {
        eventType: "ReviewModerated",
        aggregateType: "review",
        aggregateId: id,
        payload: { reviewId: id, moderationStatus, moderationNote, actorId: user.id },
      });

      sendSuccess(res, updated);
    } catch (err) {
      next(err);
    }
  },
);

// ── Analytics ──────────────────────────────────────────────────────────────────

router.get(
  "/analytics/summary",
  requireAuth,
  requireMarketplace,
  requirePermission("analytics:read:marketplace"),
  async (req, res, next): Promise<void> => {
    try {
      const marketplace = req.marketplace!;

      const [bizCount] = await db
        .select({ total: count(businessesTable.id) })
        .from(businessesTable)
        .where(and(eq(businessesTable.marketplaceId, marketplace.id), isNull(businessesTable.deletedAt)));

      const [activeCount] = await db
        .select({ total: count(businessesTable.id) })
        .from(businessesTable)
        .where(
          and(
            eq(businessesTable.marketplaceId, marketplace.id),
            eq(businessesTable.status, "active"),
            isNull(businessesTable.deletedAt),
          ),
        );

      const [reviewCount] = await db
        .select({ total: count(reviewsTable.id), avgRating: avg(reviewsTable.rating) })
        .from(reviewsTable)
        .where(and(eq(reviewsTable.marketplaceId, marketplace.id), isNull(reviewsTable.deletedAt)));

      const [searchCount] = await db
        .select({ total: count(searchLogsTable.id) })
        .from(searchLogsTable)
        .where(eq(searchLogsTable.marketplaceId, marketplace.id));

      const [zeroResultCount] = await db
        .select({ total: count(searchLogsTable.id) })
        .from(searchLogsTable)
        .where(and(eq(searchLogsTable.marketplaceId, marketplace.id), eq(searchLogsTable.resultCount, 0)));

      const [engagementCount] = await db
        .select({ total: count(engagementEventsTable.id) })
        .from(engagementEventsTable)
        .where(eq(engagementEventsTable.marketplaceId, marketplace.id));

      sendSuccess(res, {
        marketplace: { id: marketplace.id, slug: marketplace.slug, name: marketplace.name },
        businesses: {
          total: Number(bizCount?.total ?? 0),
          active: Number(activeCount?.total ?? 0),
        },
        reviews: {
          total: Number(reviewCount?.total ?? 0),
          avgRating: reviewCount?.avgRating ? Number(Number(reviewCount.avgRating).toFixed(2)) : null,
        },
        search: {
          total: Number(searchCount?.total ?? 0),
          zeroResults: Number(zeroResultCount?.total ?? 0),
          zeroResultRate:
            Number(searchCount?.total ?? 0) > 0
              ? Number(
                  (Number(zeroResultCount?.total ?? 0) / Number(searchCount?.total ?? 1)).toFixed(4),
                )
              : 0,
        },
        engagement: {
          total: Number(engagementCount?.total ?? 0),
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  "/analytics/search",
  requireAuth,
  requireMarketplace,
  requirePermission("analytics:read:marketplace"),
  async (req, res, next): Promise<void> => {
    try {
      const marketplace = req.marketplace!;
      const { days: rawDays } = req.query as { days?: string };
      const days = Math.min(Number(rawDays ?? 30), 90);
      const since = new Date(Date.now() - days * 86400000);

      const topQueries = await db
        .select({ query: searchLogsTable.query, count: count(searchLogsTable.id) })
        .from(searchLogsTable)
        .where(
          and(
            eq(searchLogsTable.marketplaceId, marketplace.id),
            gte(searchLogsTable.createdAt, since),
            sql`${searchLogsTable.query} IS NOT NULL`,
          ),
        )
        .groupBy(searchLogsTable.query)
        .orderBy(desc(count(searchLogsTable.id)))
        .limit(20);

      const zeroResultQueries = await db
        .select({ query: searchLogsTable.query, count: count(searchLogsTable.id) })
        .from(searchLogsTable)
        .where(
          and(
            eq(searchLogsTable.marketplaceId, marketplace.id),
            gte(searchLogsTable.createdAt, since),
            eq(searchLogsTable.resultCount, 0),
            sql`${searchLogsTable.query} IS NOT NULL`,
          ),
        )
        .groupBy(searchLogsTable.query)
        .orderBy(desc(count(searchLogsTable.id)))
        .limit(20);

      sendSuccess(res, { topQueries, zeroResultQueries, periodDays: days });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
