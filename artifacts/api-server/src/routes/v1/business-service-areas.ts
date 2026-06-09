import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { eq, and } from "drizzle-orm";
import { db } from "@workspace/db";
import { businessServiceAreasTable, businessesTable, businessOwnersTable, locationsTable } from "@workspace/db";
import { requireAuth } from "../../middleware/auth";
import { requireMarketplace } from "../../middleware/marketplace-context";
import { sendSuccess, sendCreated, sendNoContent } from "../../shared/response";
import { NotFoundError, ValidationError, ForbiddenError, ConflictError } from "../../shared/errors";

const router: IRouter = Router({ mergeParams: true });

const ServiceAreaSchema = z.object({
  locationId: z.string().uuid(),
  radiusKm: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
});

async function assertOwner(businessId: string, userId: string, marketplaceId: string) {
  const [biz] = await db.select({ id: businessesTable.id }).from(businessesTable)
    .where(and(eq(businessesTable.id, businessId), eq(businessesTable.marketplaceId, marketplaceId)));
  if (!biz) throw new NotFoundError("Business", businessId);
  const [owner] = await db.select({ id: businessOwnersTable.id }).from(businessOwnersTable)
    .where(and(eq(businessOwnersTable.businessId, businessId), eq(businessOwnersTable.userId, userId), eq(businessOwnersTable.isActive, true)));
  if (!owner) throw new ForbiddenError("Not an owner of this business");
}

router.get("/", requireMarketplace, async (req, res, next): Promise<void> => {
  try {
    const businessId = String(req.params["businessId"]);
    const [biz] = await db.select({ id: businessesTable.id }).from(businessesTable)
      .where(and(eq(businessesTable.id, businessId), eq(businessesTable.marketplaceId, req.marketplace!.id)));
    if (!biz) return next(new NotFoundError("Business", businessId));

    const areas = await db.select({
      id: businessServiceAreasTable.id,
      radiusKm: businessServiceAreasTable.radiusKm,
      createdAt: businessServiceAreasTable.createdAt,
      location: {
        id: locationsTable.id,
        name: locationsTable.name,
        slug: locationsTable.slug,
        fullName: locationsTable.fullName,
        levelNumber: locationsTable.levelNumber,
      },
    })
      .from(businessServiceAreasTable)
      .innerJoin(locationsTable, eq(businessServiceAreasTable.locationId, locationsTable.id))
      .where(eq(businessServiceAreasTable.businessId, businessId));

    sendSuccess(res, areas);
  } catch (err) { next(err); }
});

router.post("/", requireAuth, requireMarketplace, async (req, res, next): Promise<void> => {
  try {
    const businessId = String(req.params["businessId"]);
    await assertOwner(businessId, req.user!.id, req.marketplace!.id);
    const body = ServiceAreaSchema.safeParse(req.body);
    if (!body.success) return next(new ValidationError("Invalid input", body.error.flatten()));

    const [loc] = await db.select({ id: locationsTable.id }).from(locationsTable).where(eq(locationsTable.id, body.data.locationId));
    if (!loc) return next(new NotFoundError("Location", body.data.locationId));

    try {
      const [area] = await db.insert(businessServiceAreasTable)
        .values({ businessId, locationId: body.data.locationId, radiusKm: body.data.radiusKm ?? null })
        .returning();
      sendCreated(res, area);
    } catch (e: any) {
      if (e?.code === "23505") return next(new ConflictError("Service area already exists for this location"));
      throw e;
    }
  } catch (err) { next(err); }
});

router.delete("/:areaId", requireAuth, requireMarketplace, async (req, res, next): Promise<void> => {
  try {
    const businessId = String(req.params["businessId"]);
    const areaId = String(req.params["areaId"]);
    await assertOwner(businessId, req.user!.id, req.marketplace!.id);
    await db.delete(businessServiceAreasTable)
      .where(and(eq(businessServiceAreasTable.id, areaId), eq(businessServiceAreasTable.businessId, businessId)));
    sendNoContent(res);
  } catch (err) { next(err); }
});

export default router;
