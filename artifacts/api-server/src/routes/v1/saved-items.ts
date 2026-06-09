import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import { savedItemsTable } from "@workspace/db";
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

    sendPaginated(res, rows.slice(0, limit), buildNextCursor(rows, limit));
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
