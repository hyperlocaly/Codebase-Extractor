import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { eq, and } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  businessContactsTable,
  businessesTable,
  businessOwnersTable,
} from "@workspace/db";
import { requireAuth } from "../../middleware/auth";
import { requireMarketplace } from "../../middleware/marketplace-context";
import { sendSuccess, sendCreated, sendNoContent } from "../../shared/response";
import { NotFoundError, ValidationError, ForbiddenError } from "../../shared/errors";

const router: IRouter = Router({ mergeParams: true });

const ContactSchema = z.object({
  contactType: z.enum(["phone", "whatsapp", "email", "website", "instagram", "facebook", "twitter", "tiktok", "youtube", "other"]),
  value: z.string().min(1).max(300),
  isPrimary: z.boolean().default(false),
  displayOrder: z.number().int().min(0).default(0),
});

async function assertOwner(businessId: string, userId: string, marketplaceId: string) {
  const [biz] = await db.select({ id: businessesTable.id })
    .from(businessesTable)
    .where(and(eq(businessesTable.id, businessId), eq(businessesTable.marketplaceId, marketplaceId)));
  if (!biz) throw new NotFoundError("Business", businessId);

  const [owner] = await db.select({ id: businessOwnersTable.id })
    .from(businessOwnersTable)
    .where(and(eq(businessOwnersTable.businessId, businessId), eq(businessOwnersTable.userId, userId), eq(businessOwnersTable.isActive, true)));
  if (!owner) throw new ForbiddenError("Not an owner of this business");
}

// GET
router.get("/", requireMarketplace, async (req, res, next): Promise<void> => {
  try {
    const businessId = String(req.params["businessId"]);
    const marketplace = req.marketplace!;
    const [biz] = await db.select({ id: businessesTable.id }).from(businessesTable)
      .where(and(eq(businessesTable.id, businessId), eq(businessesTable.marketplaceId, marketplace.id)));
    if (!biz) return next(new NotFoundError("Business", businessId));

    const contacts = await db.select().from(businessContactsTable)
      .where(eq(businessContactsTable.businessId, businessId))
      .orderBy(businessContactsTable.displayOrder);
    sendSuccess(res, contacts);
  } catch (err) { next(err); }
});

// POST
router.post("/", requireAuth, requireMarketplace, async (req, res, next): Promise<void> => {
  try {
    const businessId = String(req.params["businessId"]);
    await assertOwner(businessId, req.user!.id, req.marketplace!.id);

    const body = ContactSchema.safeParse(req.body);
    if (!body.success) return next(new ValidationError("Invalid input", body.error.flatten()));

    const [contact] = await db.insert(businessContactsTable)
      .values({ businessId, ...body.data })
      .returning();

    sendCreated(res, contact);
  } catch (err) { next(err); }
});

// PATCH /:contactId
router.patch("/:contactId", requireAuth, requireMarketplace, async (req, res, next): Promise<void> => {
  try {
    const businessId = String(req.params["businessId"]);
    const contactId = String(req.params["contactId"]);
    await assertOwner(businessId, req.user!.id, req.marketplace!.id);

    const [contact] = await db.select().from(businessContactsTable)
      .where(and(eq(businessContactsTable.id, contactId), eq(businessContactsTable.businessId, businessId)));
    if (!contact) return next(new NotFoundError("Contact", contactId));

    const body = ContactSchema.partial().safeParse(req.body);
    if (!body.success) return next(new ValidationError("Invalid input", body.error.flatten()));

    const [updated] = await db.update(businessContactsTable)
      .set({ ...body.data, updatedAt: new Date() })
      .where(eq(businessContactsTable.id, contactId))
      .returning();
    sendSuccess(res, updated);
  } catch (err) { next(err); }
});

// DELETE /:contactId
router.delete("/:contactId", requireAuth, requireMarketplace, async (req, res, next): Promise<void> => {
  try {
    const businessId = String(req.params["businessId"]);
    const contactId = String(req.params["contactId"]);
    await assertOwner(businessId, req.user!.id, req.marketplace!.id);

    await db.delete(businessContactsTable)
      .where(and(eq(businessContactsTable.id, contactId), eq(businessContactsTable.businessId, businessId)));
    sendNoContent(res);
  } catch (err) { next(err); }
});

export default router;
