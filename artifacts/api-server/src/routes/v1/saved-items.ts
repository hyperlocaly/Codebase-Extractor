import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { eq, and, desc, inArray } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  savedItemsTable,
  businessesTable,
  productsTable,
  servicesTable,
} from "@workspace/db";
import { requireAuth } from "../../middleware/auth";
import { requireMarketplace } from "../../middleware/marketplace-context";
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from "../../shared/response";
import { parsePagination, buildNextCursor } from "../../shared/pagination";
import { NotFoundError, ValidationError, ConflictError } from "../../shared/errors";

const router: IRouter = Router();

const SaveSchema = z.object({
  entityType: z.enum(["business", "product", "service"]),
  entityId: z.string().uuid(),
});

// GET /api/v1/saved-items?marketplace=
router.get("/", requireAuth, requireMarketplace, async (req, res, next): Promise<void> => {
  try {
    const user = req.user!;
    const marketplace = req.marketplace!;
    const { limit: rawLimit, cursor: rawCursor } = req.query as Record<string, string | undefined>;
    const { limit } = parsePagination(rawLimit, rawCursor);

    const rows = await db.select().from(savedItemsTable)
      .where(and(eq(savedItemsTable.userId, user.id), eq(savedItemsTable.marketplaceId, marketplace.id)))
      .orderBy(desc(savedItemsTable.createdAt))
      .limit(limit + 1);

    const pageRows = rows.slice(0, limit);

    // Batch-enrich by entity type
    const businessIds = pageRows.filter((r) => r.entityType === "business").map((r) => r.entityId);
    const productIds  = pageRows.filter((r) => r.entityType === "product").map((r) => r.entityId);
    const serviceIds  = pageRows.filter((r) => r.entityType === "service").map((r) => r.entityId);

    const [businesses, products, services] = await Promise.all([
      businessIds.length > 0
        ? db.select({ id: businessesTable.id, name: businessesTable.name, slug: businessesTable.slug })
            .from(businessesTable).where(inArray(businessesTable.id, businessIds))
        : Promise.resolve([]),
      productIds.length > 0
        ? db.select({ id: productsTable.id, name: productsTable.name, slug: productsTable.slug, businessId: productsTable.businessId })
            .from(productsTable).where(inArray(productsTable.id, productIds))
        : Promise.resolve([]),
      serviceIds.length > 0
        ? db.select({ id: servicesTable.id, name: servicesTable.name, slug: servicesTable.slug, businessId: servicesTable.businessId })
            .from(servicesTable).where(inArray(servicesTable.id, serviceIds))
        : Promise.resolve([]),
    ]);

    const bizMap  = new Map(businesses.map((b) => [b.id, b]));
    const prodMap = new Map(products.map((p) => [p.id, p]));
    const svcMap  = new Map(services.map((s) => [s.id, s]));

    const enriched = pageRows.map((row) => {
      if (row.entityType === "business") {
        const biz = bizMap.get(row.entityId);
        return { ...row, entityName: biz?.name ?? null, entitySlug: biz?.slug ?? null, businessId: null };
      }
      if (row.entityType === "product") {
        const prod = prodMap.get(row.entityId);
        return { ...row, entityName: prod?.name ?? null, entitySlug: prod?.slug ?? null, businessId: prod?.businessId ?? null };
      }
      if (row.entityType === "service") {
        const svc = svcMap.get(row.entityId);
        return { ...row, entityName: svc?.name ?? null, entitySlug: svc?.slug ?? null, businessId: svc?.businessId ?? null };
      }
      return { ...row, entityName: null, entitySlug: null, businessId: null };
    });

    sendPaginated(res, enriched, buildNextCursor(rows, limit));
  } catch (err) { next(err); }
});

// POST /api/v1/saved-items
router.post("/", requireAuth, requireMarketplace, async (req, res, next): Promise<void> => {
  try {
    const user = req.user!;
    const marketplace = req.marketplace!;
    const body = SaveSchema.safeParse(req.body);
    if (!body.success) return next(new ValidationError("Invalid input", body.error.flatten()));

    const [existing] = await db.select({ id: savedItemsTable.id }).from(savedItemsTable)
      .where(and(
        eq(savedItemsTable.userId, user.id),
        eq(savedItemsTable.entityType, body.data.entityType),
        eq(savedItemsTable.entityId, body.data.entityId),
      ));
    if (existing) return next(new ConflictError("Item already saved"));

    const [saved] = await db.insert(savedItemsTable)
      .values({ userId: user.id, marketplaceId: marketplace.id, ...body.data })
      .returning();
    sendCreated(res, saved);
  } catch (err) { next(err); }
});

// DELETE /api/v1/saved-items/:id
router.delete("/:id", requireAuth, requireMarketplace, async (req, res, next): Promise<void> => {
  try {
    const id = String(req.params["id"]);
    const user = req.user!;
    const [item] = await db.select().from(savedItemsTable)
      .where(and(eq(savedItemsTable.id, id), eq(savedItemsTable.userId, user.id)));
    if (!item) return next(new NotFoundError("Saved item", id));
    await db.delete(savedItemsTable).where(eq(savedItemsTable.id, id));
    sendNoContent(res);
  } catch (err) { next(err); }
});

export default router;
