import { Router, type IRouter } from "express";
import { eq, and, desc, isNull } from "drizzle-orm";
import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db";
import { requireAuth } from "../../middleware/auth";
import { sendSuccess, sendNoContent, sendPaginated } from "../../shared/response";
import { parsePagination, buildNextCursor } from "../../shared/pagination";
import { NotFoundError, ForbiddenError } from "../../shared/errors";

const router: IRouter = Router();

// GET /api/v1/notifications
router.get("/", requireAuth, async (req, res, next): Promise<void> => {
  try {
    const user = req.user!;
    const { limit: rawLimit, cursor: rawCursor, unread } = req.query as Record<string, string | undefined>;
    const { limit } = parsePagination(rawLimit, rawCursor);

    const conditions: any[] = [eq(notificationsTable.userId, user.id)];
    if (unread === "true") conditions.push(isNull(notificationsTable.readAt));

    const rows = await db
      .select({
        id: notificationsTable.id,
        type: notificationsTable.type,
        title: notificationsTable.title,
        body: notificationsTable.body,
        channel: notificationsTable.channel,
        status: notificationsTable.status,
        entityType: notificationsTable.entityType,
        entityId: notificationsTable.entityId,
        actionUrl: notificationsTable.actionUrl,
        readAt: notificationsTable.readAt,
        createdAt: notificationsTable.createdAt,
      })
      .from(notificationsTable)
      .where(and(...conditions))
      .orderBy(desc(notificationsTable.createdAt))
      .limit(limit + 1);

    sendPaginated(res, rows.slice(0, limit), buildNextCursor(rows, limit));
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/notifications/unread-count
router.get("/unread-count", requireAuth, async (req, res, next): Promise<void> => {
  try {
    const user = req.user!;
    const rows = await db
      .select({ id: notificationsTable.id })
      .from(notificationsTable)
      .where(and(eq(notificationsTable.userId, user.id), isNull(notificationsTable.readAt)));

    sendSuccess(res, { count: rows.length });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/notifications/:id/read
router.patch("/:id/read", requireAuth, async (req, res, next): Promise<void> => {
  try {
    const id = String(req.params["id"]);
    const user = req.user!;

    const [notification] = await db
      .select({ id: notificationsTable.id, userId: notificationsTable.userId })
      .from(notificationsTable)
      .where(eq(notificationsTable.id, id));

    if (!notification) return next(new NotFoundError("Notification", id));
    if (notification.userId !== user.id) return next(new ForbiddenError());

    const [updated] = await db
      .update(notificationsTable)
      .set({ readAt: new Date(), status: "delivered" })
      .where(eq(notificationsTable.id, id))
      .returning();

    sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/notifications/read-all
router.patch("/read-all", requireAuth, async (req, res, next): Promise<void> => {
  try {
    const user = req.user!;
    const result = await db
      .update(notificationsTable)
      .set({ readAt: new Date(), status: "delivered" })
      .where(and(eq(notificationsTable.userId, user.id), isNull(notificationsTable.readAt)));

    sendSuccess(res, { updated: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/notifications/:id
router.delete("/:id", requireAuth, async (req, res, next): Promise<void> => {
  try {
    const id = String(req.params["id"]);
    const user = req.user!;

    const [notification] = await db
      .select({ id: notificationsTable.id, userId: notificationsTable.userId })
      .from(notificationsTable)
      .where(eq(notificationsTable.id, id));

    if (!notification) return next(new NotFoundError("Notification", id));
    if (notification.userId !== user.id) return next(new ForbiddenError());

    await db.delete(notificationsTable).where(eq(notificationsTable.id, id));

    sendNoContent(res);
  } catch (err) {
    next(err);
  }
});

export default router;
