import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { eq, and, isNull, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  businessesTable,
  businessTypeAssignmentsTable,
  businessContactsTable,
  businessOwnersTable,
  categoriesTable,
  userRolesTable,
  rolesTable,
} from "@workspace/db";
import { requireAuth } from "../../middleware/auth";
import { requireMarketplace } from "../../middleware/marketplace-context";
import { requirePermission } from "../../middleware/rbac";
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from "../../shared/response";
import { parsePagination, buildNextCursor } from "../../shared/pagination";
import { generateUniqueSlug } from "../../shared/slug";
import { NotFoundError, ValidationError, ForbiddenError } from "../../shared/errors";
import { publishEvent } from "../../infrastructure/outbox/publisher";

const router: IRouter = Router();

const CreateBusinessSchema = z.object({
  name: z.string().min(2).max(120),
  tagline: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  locationId: z.string().uuid().optional(),
  addressLine1: z.string().max(200).optional(),
  addressLine2: z.string().max(200).optional(),
  whatsappNumber: z.string().max(20).optional(),
  primaryPhone: z.string().max(20).optional(),
  primaryEmail: z.email().optional(),
  websiteUrl: z.url().optional(),
  categoryIds: z.array(z.string().uuid()).min(1, "At least one category is required"),
});

const UpdateBusinessSchema = CreateBusinessSchema.partial().omit({ categoryIds: true });

router.get("/", requireMarketplace, async (req, res, next): Promise<void> => {
  try {
    const { limit: rawLimit, cursor: rawCursor } = req.query as Record<string, string | undefined>;
    const { limit } = parsePagination(rawLimit, rawCursor);
    const marketplace = req.marketplace!;

    const rows = await db
      .select({
        id: businessesTable.id,
        name: businessesTable.name,
        slug: businessesTable.slug,
        tagline: businessesTable.tagline,
        status: businessesTable.status,
        claimStatus: businessesTable.claimStatus,
        verificationScore: businessesTable.verificationScore,
        whatsappNumber: businessesTable.whatsappNumber,
        primaryPhone: businessesTable.primaryPhone,
        publishedAt: businessesTable.publishedAt,
        createdAt: businessesTable.createdAt,
      })
      .from(businessesTable)
      .where(
        and(
          eq(businessesTable.marketplaceId, marketplace.id),
          isNull(businessesTable.deletedAt),
          eq(businessesTable.status, "active"),
        ),
      )
      .orderBy(desc(businessesTable.createdAt))
      .limit(limit + 1);

    const nextCursor = buildNextCursor(rows, limit);
    sendPaginated(res, rows.slice(0, limit), nextCursor);
  } catch (err) {
    next(err);
  }
});

router.post(
  "/",
  requireAuth,
  requireMarketplace,
  async (req, res, next): Promise<void> => {
    try {
      const body = CreateBusinessSchema.safeParse(req.body);
      if (!body.success) return next(new ValidationError("Invalid input", body.error.flatten()));

      const { categoryIds, ...rest } = body.data;
      const marketplace = req.marketplace!;
      const user = req.user!;

      const slug = await generateUniqueSlug(rest.name, async (s) => {
        const [existing] = await db
          .select({ id: businessesTable.id })
          .from(businessesTable)
          .where(
            and(
              eq(businessesTable.marketplaceId, marketplace.id),
              eq(businessesTable.slug, s),
              isNull(businessesTable.deletedAt),
            ),
          );
        return !!existing;
      });

      const [business] = await db.transaction(async (tx) => {
        const [biz] = await tx
          .insert(businessesTable)
          .values({
            marketplaceId: marketplace.id,
            name: rest.name,
            slug,
            tagline: rest.tagline ?? null,
            description: rest.description ?? null,
            locationId: rest.locationId ?? null,
            addressLine1: rest.addressLine1 ?? null,
            addressLine2: rest.addressLine2 ?? null,
            whatsappNumber: rest.whatsappNumber ?? null,
            primaryPhone: rest.primaryPhone ?? null,
            primaryEmail: rest.primaryEmail ?? null,
            websiteUrl: rest.websiteUrl ?? null,
            createdBy: user.id,
            status: "draft",
            claimStatus: "claimed",
          })
          .returning();

        if (!biz) throw new Error("Failed to create business");

        for (let i = 0; i < categoryIds.length; i++) {
          await tx.insert(businessTypeAssignmentsTable).values({
            businessId: biz.id,
            categoryId: categoryIds[i]!,
            isPrimary: i === 0,
          });
        }

        await tx.insert(businessOwnersTable).values({
          businessId: biz.id,
          userId: user.id,
          role: "owner",
        });

        const [ownerRole] = await tx
          .select({ id: rolesTable.id })
          .from(rolesTable)
          .where(eq(rolesTable.code, "business_owner"))
          .limit(1);

        if (ownerRole) {
          await tx
            .insert(userRolesTable)
            .values({
              userId: user.id,
              marketplaceId: marketplace.id,
              roleId: ownerRole.id,
              businessId: biz.id,
              grantedBy: user.id,
            })
            .onConflictDoNothing();
        }

        return [biz];
      });

      if (!business) throw new Error("Failed to create business");

      await publishEvent(db, {
        eventType: "BusinessCreated",
        aggregateType: "business",
        aggregateId: business.id,
        payload: { businessId: business.id, marketplaceId: marketplace.id, createdBy: user.id, name: business.name, slug: business.slug },
      });

      sendCreated(res, business);
    } catch (err) {
      next(err);
    }
  },
);

router.get("/mine", requireAuth, requireMarketplace, async (req, res, next): Promise<void> => {
  try {
    const user = req.user!;
    const marketplace = req.marketplace!;
    const { limit: rawLimit, cursor: rawCursor } = req.query as Record<string, string | undefined>;
    const { limit } = parsePagination(rawLimit, rawCursor);

    const rows = await db
      .select({
        id: businessesTable.id,
        name: businessesTable.name,
        slug: businessesTable.slug,
        tagline: businessesTable.tagline,
        status: businessesTable.status,
        claimStatus: businessesTable.claimStatus,
        verificationScore: businessesTable.verificationScore,
        whatsappNumber: businessesTable.whatsappNumber,
        primaryPhone: businessesTable.primaryPhone,
        publishedAt: businessesTable.publishedAt,
        createdAt: businessesTable.createdAt,
        addressLine1: businessesTable.addressLine1,
      })
      .from(businessesTable)
      .innerJoin(
        businessOwnersTable,
        and(
          eq(businessOwnersTable.businessId, businessesTable.id),
          eq(businessOwnersTable.userId, user.id),
          eq(businessOwnersTable.isActive, true),
        ),
      )
      .where(
        and(
          eq(businessesTable.marketplaceId, marketplace.id),
          isNull(businessesTable.deletedAt),
        ),
      )
      .orderBy(desc(businessesTable.createdAt))
      .limit(limit + 1);

    const nextCursor = buildNextCursor(rows, limit);
    sendPaginated(res, rows.slice(0, limit), nextCursor);
  } catch (err) {
    next(err);
  }
});

router.get("/:slug", requireMarketplace, async (req, res, next): Promise<void> => {
  try {
    const slug = String(req.params["slug"]);
    const marketplace = req.marketplace!;

    const [business] = await db
      .select({
        id: businessesTable.id,
        name: businessesTable.name,
        slug: businessesTable.slug,
        tagline: businessesTable.tagline,
        description: businessesTable.description,
        addressLine1: businessesTable.addressLine1,
        addressLine2: businessesTable.addressLine2,
        latitude: businessesTable.latitude,
        longitude: businessesTable.longitude,
        status: businessesTable.status,
        claimStatus: businessesTable.claimStatus,
        verificationScore: businessesTable.verificationScore,
        whatsappNumber: businessesTable.whatsappNumber,
        primaryPhone: businessesTable.primaryPhone,
        primaryEmail: businessesTable.primaryEmail,
        websiteUrl: businessesTable.websiteUrl,
        publishedAt: businessesTable.publishedAt,
        createdAt: businessesTable.createdAt,
        updatedAt: businessesTable.updatedAt,
      })
      .from(businessesTable)
      .where(
        and(
          eq(businessesTable.marketplaceId, marketplace.id),
          eq(businessesTable.slug, slug),
          isNull(businessesTable.deletedAt),
        ),
      );

    if (!business) return next(new NotFoundError("Business", slug));

    const categories = await db
      .select({
        id: categoriesTable.id,
        name: categoriesTable.name,
        slug: categoriesTable.slug,
        isPrimary: businessTypeAssignmentsTable.isPrimary,
      })
      .from(businessTypeAssignmentsTable)
      .innerJoin(categoriesTable, eq(businessTypeAssignmentsTable.categoryId, categoriesTable.id))
      .where(eq(businessTypeAssignmentsTable.businessId, business.id));

    const contacts = await db
      .select({
        id: businessContactsTable.id,
        contactType: businessContactsTable.contactType,
        value: businessContactsTable.value,
        isPrimary: businessContactsTable.isPrimary,
        isVerified: businessContactsTable.isVerified,
      })
      .from(businessContactsTable)
      .where(eq(businessContactsTable.businessId, business.id));

    sendSuccess(res, { ...business, categories, contacts });
  } catch (err) {
    next(err);
  }
});

router.patch(
  "/:id",
  requireAuth,
  requireMarketplace,
  async (req, res, next): Promise<void> => {
    try {
      const id = String(req.params["id"]);
      const marketplace = req.marketplace!;
      const user = req.user!;

      const [business] = await db
        .select({ id: businessesTable.id, createdBy: businessesTable.createdBy })
        .from(businessesTable)
        .where(
          and(
            eq(businessesTable.id, id),
            eq(businessesTable.marketplaceId, marketplace.id),
            isNull(businessesTable.deletedAt),
          ),
        );

      if (!business) return next(new NotFoundError("Business", id));

      const [owner] = await db
        .select({ id: businessOwnersTable.id })
        .from(businessOwnersTable)
        .where(
          and(
            eq(businessOwnersTable.businessId, id),
            eq(businessOwnersTable.userId, user.id),
            eq(businessOwnersTable.isActive, true),
          ),
        );

      if (!owner && business.createdBy !== user.id) {
        return next(new ForbiddenError("You do not have permission to edit this business"));
      }

      const body = UpdateBusinessSchema.safeParse(req.body);
      if (!body.success) return next(new ValidationError("Invalid input", body.error.flatten()));

      const [updated] = await db
        .update(businessesTable)
        .set({ ...body.data, updatedAt: new Date() })
        .where(eq(businessesTable.id, id))
        .returning();

      await publishEvent(db, {
        eventType: "BusinessUpdated",
        aggregateType: "business",
        aggregateId: id,
        payload: { businessId: id, marketplaceId: marketplace.id, updatedBy: user.id, changes: body.data },
      });

      sendSuccess(res, updated);
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  "/:id",
  requireAuth,
  requireMarketplace,
  async (req, res, next): Promise<void> => {
    try {
      const id = String(req.params["id"]);
      const marketplace = req.marketplace!;
      const user = req.user!;

      const [business] = await db
        .select({ id: businessesTable.id, createdBy: businessesTable.createdBy })
        .from(businessesTable)
        .where(
          and(
            eq(businessesTable.id, id),
            eq(businessesTable.marketplaceId, marketplace.id),
            isNull(businessesTable.deletedAt),
          ),
        );

      if (!business) return next(new NotFoundError("Business", id));

      const [owner] = await db
        .select({ id: businessOwnersTable.id, role: businessOwnersTable.role })
        .from(businessOwnersTable)
        .where(
          and(
            eq(businessOwnersTable.businessId, id),
            eq(businessOwnersTable.userId, user.id),
            eq(businessOwnersTable.isActive, true),
          ),
        );

      if (!owner || owner.role !== "owner") {
        return next(new ForbiddenError("Only the business owner can delete this business"));
      }

      await db
        .update(businessesTable)
        .set({ deletedAt: new Date(), status: "archived" })
        .where(eq(businessesTable.id, id));

      await publishEvent(db, {
        eventType: "BusinessDeleted",
        aggregateType: "business",
        aggregateId: id,
        payload: { businessId: id, marketplaceId: marketplace.id, deletedBy: user.id },
      });

      sendNoContent(res);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
