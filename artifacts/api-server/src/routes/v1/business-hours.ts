import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { eq, and } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  businessHoursTable,
  businessesTable,
  businessOwnersTable,
} from "@workspace/db";
import { requireAuth } from "../../middleware/auth";
import { requireMarketplace } from "../../middleware/marketplace-context";
import { sendSuccess } from "../../shared/response";
import { NotFoundError, ValidationError, ForbiddenError } from "../../shared/errors";

const router: IRouter = Router({ mergeParams: true });

const HourEntrySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  opensAt: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  closesAt: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  isClosed: z.boolean().default(false),
});

const BulkHoursSchema = z.object({
  hours: z.array(HourEntrySchema).min(1).max(7),
});

async function assertOwner(businessId: string, userId: string, marketplaceId: string) {
  const [biz] = await db
    .select({ id: businessesTable.id, marketplaceId: businessesTable.marketplaceId })
    .from(businessesTable)
    .where(and(eq(businessesTable.id, businessId), eq(businessesTable.marketplaceId, marketplaceId)));

  if (!biz) throw new NotFoundError("Business", businessId);

  const [owner] = await db
    .select({ id: businessOwnersTable.id })
    .from(businessOwnersTable)
    .where(
      and(
        eq(businessOwnersTable.businessId, businessId),
        eq(businessOwnersTable.userId, userId),
        eq(businessOwnersTable.isActive, true),
      ),
    );

  if (!owner) throw new ForbiddenError("You are not an owner of this business");
  return biz;
}

// GET /api/v1/businesses/:businessId/hours
router.get("/", requireMarketplace, async (req, res, next): Promise<void> => {
  try {
    const businessId = String(req.params["businessId"]);
    const marketplace = req.marketplace!;

    const [biz] = await db
      .select({ id: businessesTable.id })
      .from(businessesTable)
      .where(
        and(
          eq(businessesTable.id, businessId),
          eq(businessesTable.marketplaceId, marketplace.id),
        ),
      );
    if (!biz) return next(new NotFoundError("Business", businessId));

    const hours = await db
      .select()
      .from(businessHoursTable)
      .where(eq(businessHoursTable.businessId, businessId))
      .orderBy(businessHoursTable.dayOfWeek);

    sendSuccess(res, hours);
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/businesses/:businessId/hours (bulk upsert)
router.put("/", requireAuth, requireMarketplace, async (req, res, next): Promise<void> => {
  try {
    const businessId = String(req.params["businessId"]);
    const marketplace = req.marketplace!;
    const user = req.user!;

    await assertOwner(businessId, user.id, marketplace.id);

    const body = BulkHoursSchema.safeParse(req.body);
    if (!body.success) return next(new ValidationError("Invalid input", body.error.flatten()));

    const results = [];
    for (const h of body.data.hours) {
      const [upserted] = await db
        .insert(businessHoursTable)
        .values({
          businessId,
          dayOfWeek: h.dayOfWeek,
          opensAt: h.opensAt ?? null,
          closesAt: h.closesAt ?? null,
          isClosed: h.isClosed,
        })
        .onConflictDoUpdate({
          target: [businessHoursTable.businessId, businessHoursTable.dayOfWeek],
          set: {
            opensAt: h.opensAt ?? null,
            closesAt: h.closesAt ?? null,
            isClosed: h.isClosed,
            updatedAt: new Date(),
          },
        })
        .returning();
      results.push(upserted);
    }

    sendSuccess(res, results);
  } catch (err) {
    next(err);
  }
});

export default router;
