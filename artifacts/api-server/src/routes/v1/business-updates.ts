import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { eq, and, isNull, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import { businessUpdatesTable, businessesTable, businessOwnersTable } from "@workspace/db";
import { requireAuth } from "../../middleware/auth";
import { requireMarketplace } from "../../middleware/marketplace-context";
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from "../../shared/response";
import { parsePagination, buildNextCursor } from "../../shared/pagination";
import { NotFoundError, ValidationError, ForbiddenError } from "../../shared/errors";
import { publishEvent } from "../../infrastructure/outbox/publisher";

const router: IRouter = Router({ mergeParams: true });

const CreateUpdateSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  updateType: z.enum(["news", "offer", "event", "announcement"]).default("announcement"),
  publishNow: z.boolean().default(true),
  expiresAt: z.string().datetime().optional(),
});

const PatchUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(5000).optional(),
  updateType: z.enum(["news", "offer", "event", "announcement"]).optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  expiresAt: z.string().datetime().optional(),
});

async function assertOwner(businessId: string, userId: string, marketplaceId: string): Promise<void> {
  const [biz] = await db
    .select({ id: businessesTable.id })
    .from(businessesTable)
    .where(and(eq(businessesTable.id, businessId), eq(businessesTable.marketplaceId, marketplaceId), isNull(businessesTable.deletedAt)));
  if (!biz) throw new NotFoundError("Business", businessId);

  const [owner] = await db
    .select({ id: businessOwnersTable.id })
    .from(businessOwnersTable)
    .where(and(eq(businessOwnersTable.businessId, businessId), eq(businessOwnersTable.userId, userId), eq(businessOwnersTable.isActive, true)));
  if (!owner) throw new ForbiddenError("Not an owner of this business");
}

// GET /api/v1/businesses/:businessId/updates
router.get("/", requireMarketplace, async (req, res, next): Promise<void> => {
  try {
    const businessId = String(req.params["businessId"]);
    const { limit: rawLimit, cursor: rawCursor } = req.query as Record<string, string | undefined>;
    const { limit } = parsePagination(rawLimit, rawCursor);

    const rows = await db
      .select()
      .from(businessUpdatesTable)
      .where(
        and(
          eq(businessUpdatesTable.businessId, businessId),
          isNull(businessUpdatesTable.deletedAt),
          eq(businessUpdatesTable.status, "published"),
        ),
      )
      .orderBy(desc(businessUpdatesTable.publishedAt))
      .limit(limit + 1);

    sendPaginated(res, rows.slice(0, limit), buildNextCursor(rows, limit));
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/businesses/:businessId/updates
router.post("/", requireAuth, requireMarketplace, async (req, res, next): Promise<void> => {
  try {
    const businessId = String(req.params["businessId"]);
    const marketplace = req.marketplace!;
    const user = req.user!;

    await assertOwner(businessId, user.id, marketplace.id);

    const body = CreateUpdateSchema.safeParse(req.body);
    if (!body.success) return next(new ValidationError("Invalid input", body.error.flatten()));

    const now = new Date();
    const [update] = await db
      .insert(businessUpdatesTable)
      .values({
        businessId,
        title: body.data.title,
        body: body.data.body,
        updateType: body.data.updateType,
        status: body.data.publishNow ? "published" : "draft",
        publishedAt: body.data.publishNow ? now : null,
        expiresAt: body.data.expiresAt ? new Date(body.data.expiresAt) : null,
      })
      .returning();

    if (body.data.publishNow) {
      await publishEvent(db, {
        eventType: "UpdatePublished",
        aggregateType: "business_update",
        aggregateId: update!.id,
        payload: { updateId: update!.id, businessId, updateType: body.data.updateType, publishedBy: user.id },
      });
    }

    sendCreated(res, update);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/businesses/:businessId/updates/:updateId
router.patch("/:updateId", requireAuth, requireMarketplace, async (req, res, next): Promise<void> => {
  try {
    const businessId = String(req.params["businessId"]);
    const updateId = String(req.params["updateId"]);
    const marketplace = req.marketplace!;
    const user = req.user!;

    await assertOwner(businessId, user.id, marketplace.id);

    const [existing] = await db
      .select({ id: businessUpdatesTable.id, status: businessUpdatesTable.status })
      .from(businessUpdatesTable)
      .where(and(eq(businessUpdatesTable.id, updateId), eq(businessUpdatesTable.businessId, businessId), isNull(businessUpdatesTable.deletedAt)));
    if (!existing) return next(new NotFoundError("Update", updateId));

    const body = PatchUpdateSchema.safeParse(req.body);
    if (!body.success) return next(new ValidationError("Invalid input", body.error.flatten()));

    const patchData: Record<string, unknown> = { ...body.data, updatedAt: new Date() };
    if (body.data.status === "published" && existing.status !== "published") {
      patchData["publishedAt"] = new Date();
    }
    if (body.data.expiresAt) patchData["expiresAt"] = new Date(body.data.expiresAt);

    const [updated] = await db
      .update(businessUpdatesTable)
      .set(patchData as any)
      .where(eq(businessUpdatesTable.id, updateId))
      .returning();

    if (body.data.status === "published" && existing.status !== "published") {
      await publishEvent(db, {
        eventType: "UpdatePublished",
        aggregateType: "business_update",
        aggregateId: updateId,
        payload: { updateId, businessId, publishedBy: user.id },
      });
    }

    sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/businesses/:businessId/updates/:updateId
router.delete("/:updateId", requireAuth, requireMarketplace, async (req, res, next): Promise<void> => {
  try {
    const businessId = String(req.params["businessId"]);
    const updateId = String(req.params["updateId"]);
    const marketplace = req.marketplace!;
    const user = req.user!;

    await assertOwner(businessId, user.id, marketplace.id);

    const [existing] = await db
      .select({ id: businessUpdatesTable.id })
      .from(businessUpdatesTable)
      .where(and(eq(businessUpdatesTable.id, updateId), eq(businessUpdatesTable.businessId, businessId), isNull(businessUpdatesTable.deletedAt)));
    if (!existing) return next(new NotFoundError("Update", updateId));

    await db
      .update(businessUpdatesTable)
      .set({ deletedAt: new Date(), status: "archived" })
      .where(eq(businessUpdatesTable.id, updateId));

    await publishEvent(db, {
      eventType: "UpdateDeleted",
      aggregateType: "business_update",
      aggregateId: updateId,
      payload: { updateId, businessId, deletedBy: user.id },
    });

    sendNoContent(res);
  } catch (err) {
    next(err);
  }
});

export default router;
