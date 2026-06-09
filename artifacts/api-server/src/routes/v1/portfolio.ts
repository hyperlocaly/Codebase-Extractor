import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { eq, and, isNull, asc, or } from "drizzle-orm";
import { db } from "@workspace/db";
import { portfoliosTable, portfolioItemsTable, businessesTable } from "@workspace/db";
import { requireAuth } from "../../middleware/auth";
import { requireMarketplace } from "../../middleware/marketplace-context";
import { sendSuccess, sendCreated, sendNoContent } from "../../shared/response";
import { NotFoundError, ValidationError } from "../../shared/errors";
import { assertBusinessOwner } from "../../shared/business-owner";

const router: IRouter = Router({ mergeParams: true });

const PortfolioSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  featuredImage: z.url().optional(),
  sortOrder: z.number().int().min(0).default(0),
  status: z.enum(["draft", "published"]).optional(),
});

const PortfolioItemSchema = z.object({
  mediaUrl: z.url(),
  thumbnailUrl: z.url().optional(),
  caption: z.string().max(500).optional(),
  description: z.string().max(2000).optional(),
  externalUrl: z.url().optional(),
  sortOrder: z.number().int().min(0).default(0),
});

// GET /businesses/:businessId/portfolio
// Public: returns published only.
// Authenticated owner: pass status=all or status=draft to see own drafts.
router.get("/", requireMarketplace, async (req, res, next): Promise<void> => {
  try {
    const businessId = String(req.params["businessId"]);
    const [biz] = await db.select({ id: businessesTable.id }).from(businessesTable)
      .where(and(eq(businessesTable.id, businessId), eq(businessesTable.marketplaceId, req.marketplace!.id), isNull(businessesTable.deletedAt)));
    if (!biz) return next(new NotFoundError("Business", businessId));

    const statusParam = String(req.query["status"] ?? "published");
    let statusFilter;
    const isOwnerRequest = statusParam === "all" || statusParam === "draft";

    if (isOwnerRequest) {
      if (!req.user) {
        return next(new NotFoundError("Business", businessId));
      }
      await assertBusinessOwner(businessId, req.user.id, req.marketplace!.id);
      statusFilter = statusParam === "all"
        ? isNull(portfoliosTable.deletedAt)
        : and(isNull(portfoliosTable.deletedAt), eq(portfoliosTable.status, "draft"));
    } else {
      statusFilter = and(isNull(portfoliosTable.deletedAt), eq(portfoliosTable.status, "published"));
    }

    const portfolios = await db.select().from(portfoliosTable)
      .where(and(eq(portfoliosTable.businessId, businessId), statusFilter))
      .orderBy(asc(portfoliosTable.sortOrder));

    const results = await Promise.all(portfolios.map(async (p) => {
      const items = await db.select().from(portfolioItemsTable)
        .where(eq(portfolioItemsTable.portfolioId, p.id))
        .orderBy(asc(portfolioItemsTable.sortOrder));
      return { ...p, items };
    }));

    sendSuccess(res, results);
  } catch (err) { next(err); }
});

// POST /businesses/:businessId/portfolio
router.post("/", requireAuth, requireMarketplace, async (req, res, next): Promise<void> => {
  try {
    const businessId = String(req.params["businessId"]);
    await assertBusinessOwner(businessId, req.user!.id, req.marketplace!.id);
    const body = PortfolioSchema.omit({ status: true }).safeParse(req.body);
    if (!body.success) return next(new ValidationError("Invalid input", body.error.flatten()));
    const [portfolio] = await db.insert(portfoliosTable).values({ businessId, ...body.data, status: "draft" }).returning();
    sendCreated(res, portfolio);
  } catch (err) { next(err); }
});

// PATCH /businesses/:businessId/portfolio/:id
router.patch("/:id", requireAuth, requireMarketplace, async (req, res, next): Promise<void> => {
  try {
    const businessId = String(req.params["businessId"]);
    const id = String(req.params["id"]);
    await assertBusinessOwner(businessId, req.user!.id, req.marketplace!.id);
    const [portfolio] = await db.select().from(portfoliosTable)
      .where(and(eq(portfoliosTable.id, id), eq(portfoliosTable.businessId, businessId), isNull(portfoliosTable.deletedAt)));
    if (!portfolio) return next(new NotFoundError("Portfolio", id));
    const body = PortfolioSchema.partial().safeParse(req.body);
    if (!body.success) return next(new ValidationError("Invalid input", body.error.flatten()));
    const [updated] = await db.update(portfoliosTable).set({ ...body.data, updatedAt: new Date() }).where(eq(portfoliosTable.id, id)).returning();
    sendSuccess(res, updated);
  } catch (err) { next(err); }
});

// DELETE /businesses/:businessId/portfolio/:id
router.delete("/:id", requireAuth, requireMarketplace, async (req, res, next): Promise<void> => {
  try {
    const businessId = String(req.params["businessId"]);
    const id = String(req.params["id"]);
    await assertBusinessOwner(businessId, req.user!.id, req.marketplace!.id);
    await db.update(portfoliosTable).set({ deletedAt: new Date() }).where(and(eq(portfoliosTable.id, id), eq(portfoliosTable.businessId, businessId)));
    sendNoContent(res);
  } catch (err) { next(err); }
});

// POST /businesses/:businessId/portfolio/:id/items
router.post("/:id/items", requireAuth, requireMarketplace, async (req, res, next): Promise<void> => {
  try {
    const businessId = String(req.params["businessId"]);
    const portfolioId = String(req.params["id"]);
    await assertBusinessOwner(businessId, req.user!.id, req.marketplace!.id);
    const [portfolio] = await db.select().from(portfoliosTable)
      .where(and(eq(portfoliosTable.id, portfolioId), eq(portfoliosTable.businessId, businessId), isNull(portfoliosTable.deletedAt)));
    if (!portfolio) return next(new NotFoundError("Portfolio", portfolioId));
    const body = PortfolioItemSchema.safeParse(req.body);
    if (!body.success) return next(new ValidationError("Invalid input", body.error.flatten()));
    const [item] = await db.insert(portfolioItemsTable).values({ portfolioId, ...body.data }).returning();
    sendCreated(res, item);
  } catch (err) { next(err); }
});

// PATCH /businesses/:businessId/portfolio/:id/items/:itemId
router.patch("/:id/items/:itemId", requireAuth, requireMarketplace, async (req, res, next): Promise<void> => {
  try {
    const businessId = String(req.params["businessId"]);
    const portfolioId = String(req.params["id"]);
    const itemId = String(req.params["itemId"]);
    await assertBusinessOwner(businessId, req.user!.id, req.marketplace!.id);
    const [portfolio] = await db.select({ id: portfoliosTable.id }).from(portfoliosTable)
      .where(and(eq(portfoliosTable.id, portfolioId), eq(portfoliosTable.businessId, businessId), isNull(portfoliosTable.deletedAt)));
    if (!portfolio) return next(new NotFoundError("Portfolio", portfolioId));
    const [item] = await db.select().from(portfolioItemsTable)
      .where(and(eq(portfolioItemsTable.id, itemId), eq(portfolioItemsTable.portfolioId, portfolioId)));
    if (!item) return next(new NotFoundError("PortfolioItem", itemId));
    const body = PortfolioItemSchema.partial().safeParse(req.body);
    if (!body.success) return next(new ValidationError("Invalid input", body.error.flatten()));
    const [updated] = await db.update(portfolioItemsTable).set({ ...body.data, updatedAt: new Date() }).where(eq(portfolioItemsTable.id, itemId)).returning();
    sendSuccess(res, updated);
  } catch (err) { next(err); }
});

// DELETE /businesses/:businessId/portfolio/:id/items/:itemId
router.delete("/:id/items/:itemId", requireAuth, requireMarketplace, async (req, res, next): Promise<void> => {
  try {
    const businessId = String(req.params["businessId"]);
    const portfolioId = String(req.params["id"]);
    const itemId = String(req.params["itemId"]);
    await assertBusinessOwner(businessId, req.user!.id, req.marketplace!.id);
    await db.delete(portfolioItemsTable)
      .where(and(eq(portfolioItemsTable.id, itemId), eq(portfolioItemsTable.portfolioId, portfolioId)));
    sendNoContent(res);
  } catch (err) { next(err); }
});

export default router;
