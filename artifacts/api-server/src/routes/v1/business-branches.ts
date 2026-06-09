import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@workspace/db";
import { businessBranchesTable, businessesTable, businessOwnersTable } from "@workspace/db";
import { requireAuth } from "../../middleware/auth";
import { requireMarketplace } from "../../middleware/marketplace-context";
import { sendSuccess, sendCreated, sendNoContent } from "../../shared/response";
import { NotFoundError, ValidationError, ForbiddenError } from "../../shared/errors";

const router: IRouter = Router({ mergeParams: true });

const BranchSchema = z.object({
  name: z.string().min(1).max(120),
  locationId: z.string().uuid().optional(),
  addressLine1: z.string().max(200).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  isPrimary: z.boolean().default(false),
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
    const branches = await db.select().from(businessBranchesTable)
      .where(eq(businessBranchesTable.businessId, businessId))
      .orderBy(businessBranchesTable.isPrimary, businessBranchesTable.createdAt);
    sendSuccess(res, branches);
  } catch (err) { next(err); }
});

router.post("/", requireAuth, requireMarketplace, async (req, res, next): Promise<void> => {
  try {
    const businessId = String(req.params["businessId"]);
    await assertOwner(businessId, req.user!.id, req.marketplace!.id);
    const body = BranchSchema.safeParse(req.body);
    if (!body.success) return next(new ValidationError("Invalid input", body.error.flatten()));
    const { latitude, longitude, ...rest } = body.data;
    const [branch] = await db.insert(businessBranchesTable).values({
      businessId,
      ...rest,
      latitude: latitude?.toString() ?? null,
      longitude: longitude?.toString() ?? null,
    }).returning();
    sendCreated(res, branch);
  } catch (err) { next(err); }
});

router.patch("/:branchId", requireAuth, requireMarketplace, async (req, res, next): Promise<void> => {
  try {
    const businessId = String(req.params["businessId"]);
    const branchId = String(req.params["branchId"]);
    await assertOwner(businessId, req.user!.id, req.marketplace!.id);
    const [branch] = await db.select().from(businessBranchesTable)
      .where(and(eq(businessBranchesTable.id, branchId), eq(businessBranchesTable.businessId, businessId)));
    if (!branch) return next(new NotFoundError("Branch", branchId));
    const body = BranchSchema.partial().safeParse(req.body);
    if (!body.success) return next(new ValidationError("Invalid input", body.error.flatten()));
    const { latitude, longitude, ...rest } = body.data;
    const [updated] = await db.update(businessBranchesTable)
      .set({
        ...rest,
        ...(latitude !== undefined && { latitude: latitude.toString() }),
        ...(longitude !== undefined && { longitude: longitude.toString() }),
        updatedAt: new Date(),
      })
      .where(eq(businessBranchesTable.id, branchId))
      .returning();
    sendSuccess(res, updated);
  } catch (err) { next(err); }
});

router.delete("/:branchId", requireAuth, requireMarketplace, async (req, res, next): Promise<void> => {
  try {
    const businessId = String(req.params["businessId"]);
    const branchId = String(req.params["branchId"]);
    await assertOwner(businessId, req.user!.id, req.marketplace!.id);
    await db.delete(businessBranchesTable)
      .where(and(eq(businessBranchesTable.id, branchId), eq(businessBranchesTable.businessId, businessId)));
    sendNoContent(res);
  } catch (err) { next(err); }
});

export default router;
