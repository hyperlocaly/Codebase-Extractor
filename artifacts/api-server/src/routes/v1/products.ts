import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { eq, and, isNull, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import { productsTable, businessesTable, businessOwnersTable } from "@workspace/db";
import { requireAuth } from "../../middleware/auth";
import { requireMarketplace } from "../../middleware/marketplace-context";
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from "../../shared/response";
import { parsePagination, buildNextCursor } from "../../shared/pagination";
import { generateUniqueSlug } from "../../shared/slug";
import { NotFoundError, ValidationError, ForbiddenError } from "../../shared/errors";
import { publishEvent } from "../../infrastructure/outbox/publisher";

const router: IRouter = Router({ mergeParams: true });

const ProductSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  currencyId: z.string().uuid().optional(),
  unit: z.string().max(50).optional(),
  stockStatus: z.enum(["in_stock", "out_of_stock", "made_to_order"]).default("in_stock"),
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
        ? isNull(productsTable.deletedAt)
        : rawStatus === "draft" || rawStatus === "archived"
          ? and(isNull(productsTable.deletedAt), eq(productsTable.status, rawStatus))
          : and(isNull(productsTable.deletedAt), eq(productsTable.status, "active"));

    const rows = await db
      .select()
      .from(productsTable)
      .where(and(eq(productsTable.businessId, businessId), statusCondition))
      .orderBy(productsTable.sortOrder, desc(productsTable.createdAt))
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
    const [product] = await db
      .select()
      .from(productsTable)
      .where(and(eq(productsTable.businessId, businessId), eq(productsTable.slug, slug), isNull(productsTable.deletedAt)));
    if (!product) return next(new NotFoundError("Product", slug));
    sendSuccess(res, product);
  } catch (err) {
    next(err);
  }
});

router.post("/", requireAuth, requireMarketplace, async (req, res, next): Promise<void> => {
  try {
    const businessId = String(req.params["businessId"]);
    const user = req.user!;
    await assertOwner(businessId, user.id, req.marketplace!.id);

    const body = ProductSchema.safeParse(req.body);
    if (!body.success) return next(new ValidationError("Invalid input", body.error.flatten()));

    const slug = await generateUniqueSlug(body.data.name, async (s) => {
      const [e] = await db
        .select({ id: productsTable.id })
        .from(productsTable)
        .where(and(eq(productsTable.businessId, businessId), eq(productsTable.slug, s), isNull(productsTable.deletedAt)));
      return !!e;
    });

    const [product] = await db
      .insert(productsTable)
      .values({ businessId, ...body.data, slug, status: "active" })
      .returning();

    await publishEvent(db, {
      eventType: "ProductCreated",
      aggregateType: "product",
      aggregateId: product!.id,
      payload: { productId: product!.id, businessId, name: product!.name, createdBy: user.id },
    });

    sendCreated(res, product);
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

    const [product] = await db
      .select()
      .from(productsTable)
      .where(and(eq(productsTable.id, id), eq(productsTable.businessId, businessId), isNull(productsTable.deletedAt)));
    if (!product) return next(new NotFoundError("Product", id));

    const body = ProductSchema.partial().safeParse(req.body);
    if (!body.success) return next(new ValidationError("Invalid input", body.error.flatten()));

    const [updated] = await db
      .update(productsTable)
      .set({ ...body.data, updatedAt: new Date() })
      .where(eq(productsTable.id, id))
      .returning();

    await publishEvent(db, {
      eventType: "ProductUpdated",
      aggregateType: "product",
      aggregateId: id,
      payload: { productId: id, businessId, changes: body.data, updatedBy: user.id },
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
      .update(productsTable)
      .set({ deletedAt: new Date(), status: "archived" })
      .where(and(eq(productsTable.id, id), eq(productsTable.businessId, businessId)));

    await publishEvent(db, {
      eventType: "ProductDeleted",
      aggregateType: "product",
      aggregateId: id,
      payload: { productId: id, businessId, deletedBy: user.id },
    });

    sendNoContent(res);
  } catch (err) {
    next(err);
  }
});

export default router;
