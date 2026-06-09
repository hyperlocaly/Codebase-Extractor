import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { eq, and, isNull, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import { servicesTable, businessesTable, businessOwnersTable } from "@workspace/db";
import { requireAuth } from "../../middleware/auth";
import { requireMarketplace } from "../../middleware/marketplace-context";
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from "../../shared/response";
import { parsePagination, buildNextCursor } from "../../shared/pagination";
import { generateUniqueSlug } from "../../shared/slug";
import { NotFoundError, ValidationError, ForbiddenError } from "../../shared/errors";
import { publishEvent } from "../../infrastructure/outbox/publisher";

const router: IRouter = Router({ mergeParams: true });

const ServiceSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  priceFrom: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  priceTo: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  currencyId: z.string().uuid().optional(),
  durationMinutes: z.number().int().min(1).optional(),
  availability: z.string().max(200).optional(),
  categoryId: z.string().uuid().optional(),
  sortOrder: z.number().int().min(0).default(0),
});

async function assertOwner(businessId: string, userId: string, marketplaceId: string) {
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

router.get("/", requireMarketplace, async (req, res, next): Promise<void> => {
  try {
    const businessId = String(req.params["businessId"]);
    const { limit: rawLimit, cursor: rawCursor, status: rawStatus } = req.query as Record<string, string | undefined>;
    const { limit } = parsePagination(rawLimit, rawCursor);

    const statusCondition =
      rawStatus === "all"
        ? isNull(servicesTable.deletedAt)
        : rawStatus === "draft" || rawStatus === "archived"
          ? and(isNull(servicesTable.deletedAt), eq(servicesTable.status, rawStatus))
          : and(isNull(servicesTable.deletedAt), eq(servicesTable.status, "active"));

    const rows = await db
      .select()
      .from(servicesTable)
      .where(and(eq(servicesTable.businessId, businessId), statusCondition))
      .orderBy(servicesTable.sortOrder, desc(servicesTable.createdAt))
      .limit(limit + 1);
    sendPaginated(res, rows.slice(0, limit), buildNextCursor(rows, limit));
  } catch (err) {
    next(err);
  }
});

router.get("/:slug", requireMarketplace, async (req, res, next): Promise<void> => {
  try {
    const businessId = String(req.params["businessId"]);
    const slug = String(req.params["slug"]);
    const [service] = await db
      .select()
      .from(servicesTable)
      .where(and(eq(servicesTable.businessId, businessId), eq(servicesTable.slug, slug), isNull(servicesTable.deletedAt)));
    if (!service) return next(new NotFoundError("Service", slug));
    sendSuccess(res, service);
  } catch (err) {
    next(err);
  }
});

router.post("/", requireAuth, requireMarketplace, async (req, res, next): Promise<void> => {
  try {
    const businessId = String(req.params["businessId"]);
    const user = req.user!;
    await assertOwner(businessId, user.id, req.marketplace!.id);

    const body = ServiceSchema.safeParse(req.body);
    if (!body.success) return next(new ValidationError("Invalid input", body.error.flatten()));

    const slug = await generateUniqueSlug(body.data.name, async (s) => {
      const [e] = await db
        .select({ id: servicesTable.id })
        .from(servicesTable)
        .where(and(eq(servicesTable.businessId, businessId), eq(servicesTable.slug, s), isNull(servicesTable.deletedAt)));
      return !!e;
    });

    const [service] = await db
      .insert(servicesTable)
      .values({ businessId, ...body.data, slug, status: "active" })
      .returning();

    await publishEvent(db, {
      eventType: "ServiceCreated",
      aggregateType: "service",
      aggregateId: service!.id,
      payload: { serviceId: service!.id, businessId, name: service!.name, createdBy: user.id },
    });

    sendCreated(res, service);
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", requireAuth, requireMarketplace, async (req, res, next): Promise<void> => {
  try {
    const businessId = String(req.params["businessId"]);
    const id = String(req.params["id"]);
    const user = req.user!;
    await assertOwner(businessId, user.id, req.marketplace!.id);

    const [service] = await db
      .select()
      .from(servicesTable)
      .where(and(eq(servicesTable.id, id), eq(servicesTable.businessId, businessId), isNull(servicesTable.deletedAt)));
    if (!service) return next(new NotFoundError("Service", id));

    const body = ServiceSchema.partial().safeParse(req.body);
    if (!body.success) return next(new ValidationError("Invalid input", body.error.flatten()));

    const [updated] = await db
      .update(servicesTable)
      .set({ ...body.data, updatedAt: new Date() })
      .where(eq(servicesTable.id, id))
      .returning();

    await publishEvent(db, {
      eventType: "ServiceUpdated",
      aggregateType: "service",
      aggregateId: id,
      payload: { serviceId: id, businessId, changes: body.data, updatedBy: user.id },
    });

    sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", requireAuth, requireMarketplace, async (req, res, next): Promise<void> => {
  try {
    const businessId = String(req.params["businessId"]);
    const id = String(req.params["id"]);
    const user = req.user!;
    await assertOwner(businessId, user.id, req.marketplace!.id);

    await db
      .update(servicesTable)
      .set({ deletedAt: new Date(), status: "archived" })
      .where(and(eq(servicesTable.id, id), eq(servicesTable.businessId, businessId)));

    await publishEvent(db, {
      eventType: "ServiceDeleted",
      aggregateType: "service",
      aggregateId: id,
      payload: { serviceId: id, businessId, deletedBy: user.id },
    });

    sendNoContent(res);
  } catch (err) {
    next(err);
  }
});

export default router;
