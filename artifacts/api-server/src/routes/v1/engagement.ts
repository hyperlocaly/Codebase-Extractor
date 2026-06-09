import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { db } from "@workspace/db";
import { engagementEventsTable } from "@workspace/db";
import { requireMarketplace } from "../../middleware/marketplace-context";
import { sendSuccess } from "../../shared/response";
import { ValidationError } from "../../shared/errors";

const router: IRouter = Router();

const TrackEventSchema = z.object({
  entityType: z.enum(["business", "product", "service", "portfolio_item"]),
  entityId: z.string().uuid(),
  eventType: z.enum(["view", "contact_click", "whatsapp_click", "phone_click", "directions_click", "website_click", "save", "share"]),
  sessionId: z.string().max(100).optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

/**
 * POST /api/v1/engagement/track
 * Track a user engagement event (view, click, etc.)
 * Fire-and-forget from clients — always returns 200.
 */
router.post("/track", requireMarketplace, async (req, res, next): Promise<void> => {
  try {
    const body = TrackEventSchema.safeParse(req.body);
    if (!body.success) return next(new ValidationError("Invalid input", body.error.flatten()));

    const marketplace = req.marketplace!;
    const user = req.user;
    const ipAddress = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim()
      ?? req.socket.remoteAddress
      ?? null;

    // Insert without awaiting a response (fire-and-forget) — still await to catch DB errors
    await db.insert(engagementEventsTable).values({
      marketplaceId: marketplace.id,
      businessId: body.data.entityType === "business" ? body.data.entityId : null,
      entityType: body.data.entityType,
      entityId: body.data.entityId,
      eventType: body.data.eventType,
      sessionId: body.data.sessionId ?? null,
      userId: user?.id ?? null,
      ipAddress,
      metadata: body.data.metadata,
    });

    sendSuccess(res, { tracked: true });
  } catch (err) {
    next(err);
  }
});

export default router;
