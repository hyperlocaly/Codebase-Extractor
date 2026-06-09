import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { eq, and, isNull, asc } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  locationTemplatesTable,
  locationTemplateMarketplaceConfigsTable,
  categoryTemplatesTable,
  categoryTemplateMarketplaceConfigsTable,
  countriesTable,
  categoriesTable,
  marketplacesTable,
} from "@workspace/db";
import { requireAuth } from "../../middleware/auth";
import { requireMarketplace } from "../../middleware/marketplace-context";
import { requirePermission } from "../../middleware/rbac";
import { sendSuccess, sendCreated, sendNoContent } from "../../shared/response";
import { NotFoundError, ValidationError, ConflictError } from "../../shared/errors";

const router: IRouter = Router();

// ─── Location Templates ───────────────────────────────────────────────────────

const LocationTemplateSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
  countryId: z.string().uuid(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().default(true),
});

// GET /api/v1/templates/locations
router.get("/locations", async (req, res, next): Promise<void> => {
  try {
    const templates = await db
      .select({
        id: locationTemplatesTable.id,
        name: locationTemplatesTable.name,
        slug: locationTemplatesTable.slug,
        description: locationTemplatesTable.description,
        isActive: locationTemplatesTable.isActive,
        isDefault: locationTemplatesTable.isDefault,
        createdAt: locationTemplatesTable.createdAt,
        country: {
          id: countriesTable.id,
          name: countriesTable.name,
          isoCode: countriesTable.isoCode,
        },
      })
      .from(locationTemplatesTable)
      .innerJoin(countriesTable, eq(locationTemplatesTable.countryId, countriesTable.id))
      .where(isNull(locationTemplatesTable.deletedAt))
      .orderBy(asc(locationTemplatesTable.name));
    sendSuccess(res, templates);
  } catch (err) { next(err); }
});

// GET /api/v1/templates/locations/:id
router.get("/locations/:id", async (req, res, next): Promise<void> => {
  try {
    const id = String(req.params["id"]);
    const [template] = await db
      .select({
        id: locationTemplatesTable.id,
        name: locationTemplatesTable.name,
        slug: locationTemplatesTable.slug,
        description: locationTemplatesTable.description,
        isActive: locationTemplatesTable.isActive,
        isDefault: locationTemplatesTable.isDefault,
        createdAt: locationTemplatesTable.createdAt,
        country: {
          id: countriesTable.id,
          name: countriesTable.name,
          isoCode: countriesTable.isoCode,
          phoneCode: countriesTable.phoneCode,
        },
      })
      .from(locationTemplatesTable)
      .innerJoin(countriesTable, eq(locationTemplatesTable.countryId, countriesTable.id))
      .where(and(eq(locationTemplatesTable.id, id), isNull(locationTemplatesTable.deletedAt)));
    if (!template) return next(new NotFoundError("Location template", id));
    sendSuccess(res, template);
  } catch (err) { next(err); }
});

// POST /api/v1/templates/locations
router.post("/locations", requireAuth, requirePermission("admin:manage"), async (req, res, next): Promise<void> => {
  try {
    const body = LocationTemplateSchema.safeParse(req.body);
    if (!body.success) return next(new ValidationError("Invalid input", body.error.flatten()));

    const [existing] = await db.select({ id: locationTemplatesTable.id }).from(locationTemplatesTable)
      .where(and(eq(locationTemplatesTable.slug, body.data.slug), isNull(locationTemplatesTable.deletedAt)));
    if (existing) return next(new ConflictError(`Location template slug "${body.data.slug}" already exists`));

    const [country] = await db.select({ id: countriesTable.id }).from(countriesTable)
      .where(eq(countriesTable.id, body.data.countryId));
    if (!country) return next(new NotFoundError("Country", body.data.countryId));

    const [template] = await db.insert(locationTemplatesTable)
      .values({ ...body.data, createdBy: req.user!.id })
      .returning();
    sendCreated(res, template);
  } catch (err) { next(err); }
});

// POST /api/v1/templates/locations/:id/clone
router.post("/locations/:id/clone", requireAuth, requirePermission("admin:manage"), async (req, res, next): Promise<void> => {
  try {
    const id = String(req.params["id"]);
    const [source] = await db.select().from(locationTemplatesTable)
      .where(and(eq(locationTemplatesTable.id, id), isNull(locationTemplatesTable.deletedAt)));
    if (!source) return next(new NotFoundError("Location template", id));

    const { name, newSlug } = z.object({ name: z.string().min(1), newSlug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/) }).parse(req.body);
    const [cloned] = await db.insert(locationTemplatesTable).values({
      name,
      slug: newSlug,
      countryId: source.countryId,
      description: source.description,
      isActive: false,
      createdBy: req.user!.id,
    }).returning();
    sendCreated(res, cloned);
  } catch (err) { next(err); }
});

// PATCH /api/v1/templates/locations/:id
router.patch("/locations/:id", requireAuth, requirePermission("admin:manage"), async (req, res, next): Promise<void> => {
  try {
    const id = String(req.params["id"]);
    const [template] = await db.select().from(locationTemplatesTable)
      .where(and(eq(locationTemplatesTable.id, id), isNull(locationTemplatesTable.deletedAt)));
    if (!template) return next(new NotFoundError("Location template", id));
    const body = LocationTemplateSchema.partial().safeParse(req.body);
    if (!body.success) return next(new ValidationError("Invalid input", body.error.flatten()));
    const [updated] = await db.update(locationTemplatesTable).set({ ...body.data, updatedAt: new Date() }).where(eq(locationTemplatesTable.id, id)).returning();
    sendSuccess(res, updated);
  } catch (err) { next(err); }
});

// DELETE /api/v1/templates/locations/:id
router.delete("/locations/:id", requireAuth, requirePermission("admin:manage"), async (req, res, next): Promise<void> => {
  try {
    const id = String(req.params["id"]);
    await db.update(locationTemplatesTable).set({ deletedAt: new Date(), isActive: false }).where(eq(locationTemplatesTable.id, id));
    sendNoContent(res);
  } catch (err) { next(err); }
});

// POST /api/v1/templates/locations/:id/activate
router.post("/locations/:id/activate", requireAuth, requirePermission("admin:manage"), async (req, res, next): Promise<void> => {
  try {
    const id = String(req.params["id"]);
    const [updated] = await db.update(locationTemplatesTable).set({ isActive: true, updatedAt: new Date() }).where(eq(locationTemplatesTable.id, id)).returning();
    sendSuccess(res, updated);
  } catch (err) { next(err); }
});

// POST /api/v1/templates/locations/:id/set-marketplace-default
router.post("/locations/:id/set-marketplace-default", requireAuth, requirePermission("admin:manage"), requireMarketplace, async (req, res, next): Promise<void> => {
  try {
    const templateId = String(req.params["id"]);
    const marketplace = req.marketplace!;
    const { defaultStartLevel, hiddenLevels } = z.object({
      defaultStartLevel: z.number().int().min(1).default(1),
      hiddenLevels: z.array(z.number().int()).default([]),
    }).parse(req.body);

    const [upserted] = await db.insert(locationTemplateMarketplaceConfigsTable)
      .values({ marketplaceId: marketplace.id, templateId, defaultStartLevel, hiddenLevels })
      .onConflictDoUpdate({
        target: [locationTemplateMarketplaceConfigsTable.marketplaceId],
        set: { templateId, defaultStartLevel, hiddenLevels, updatedAt: new Date() },
      }).returning();
    sendSuccess(res, upserted);
  } catch (err) { next(err); }
});

// ─── Category Templates ───────────────────────────────────────────────────────

const CategoryTemplateSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
  rootCategoryId: z.string().uuid(),
  description: z.string().max(500).optional(),
  displayConfig: z.object({
    rootLabel: z.string().optional(),
    depth1Label: z.string().optional(),
    depth2Label: z.string().optional(),
    showRootInBreadcrumb: z.boolean().optional(),
  }).optional(),
  isActive: z.boolean().default(true),
});

// GET /api/v1/templates/categories
router.get("/categories", async (req, res, next): Promise<void> => {
  try {
    const templates = await db
      .select({
        id: categoryTemplatesTable.id,
        name: categoryTemplatesTable.name,
        slug: categoryTemplatesTable.slug,
        description: categoryTemplatesTable.description,
        isActive: categoryTemplatesTable.isActive,
        displayConfig: categoryTemplatesTable.displayConfig,
        createdAt: categoryTemplatesTable.createdAt,
        rootCategory: {
          id: categoriesTable.id,
          name: categoriesTable.name,
          slug: categoriesTable.slug,
        },
      })
      .from(categoryTemplatesTable)
      .innerJoin(categoriesTable, eq(categoryTemplatesTable.rootCategoryId, categoriesTable.id))
      .where(isNull(categoryTemplatesTable.deletedAt))
      .orderBy(asc(categoryTemplatesTable.name));
    sendSuccess(res, templates);
  } catch (err) { next(err); }
});

// POST /api/v1/templates/categories
router.post("/categories", requireAuth, requirePermission("admin:manage"), async (req, res, next): Promise<void> => {
  try {
    const body = CategoryTemplateSchema.safeParse(req.body);
    if (!body.success) return next(new ValidationError("Invalid input", body.error.flatten()));

    const [existing] = await db.select({ id: categoryTemplatesTable.id }).from(categoryTemplatesTable)
      .where(and(eq(categoryTemplatesTable.slug, body.data.slug), isNull(categoryTemplatesTable.deletedAt)));
    if (existing) return next(new ConflictError(`Category template slug "${body.data.slug}" already exists`));

    const [cat] = await db.select({ id: categoriesTable.id }).from(categoriesTable).where(eq(categoriesTable.id, body.data.rootCategoryId));
    if (!cat) return next(new NotFoundError("Category", body.data.rootCategoryId));

    const [template] = await db.insert(categoryTemplatesTable)
      .values({ ...body.data, displayConfig: body.data.displayConfig ?? {}, createdBy: req.user!.id })
      .returning();
    sendCreated(res, template);
  } catch (err) { next(err); }
});

// POST /api/v1/templates/categories/:id/clone
router.post("/categories/:id/clone", requireAuth, requirePermission("admin:manage"), async (req, res, next): Promise<void> => {
  try {
    const id = String(req.params["id"]);
    const [source] = await db.select().from(categoryTemplatesTable)
      .where(and(eq(categoryTemplatesTable.id, id), isNull(categoryTemplatesTable.deletedAt)));
    if (!source) return next(new NotFoundError("Category template", id));
    const { name, newSlug } = z.object({ name: z.string().min(1), newSlug: z.string().min(1) }).parse(req.body);
    const [cloned] = await db.insert(categoryTemplatesTable).values({
      name, slug: newSlug, rootCategoryId: source.rootCategoryId,
      description: source.description, displayConfig: source.displayConfig ?? {},
      isActive: false, createdBy: req.user!.id,
    }).returning();
    sendCreated(res, cloned);
  } catch (err) { next(err); }
});

// PATCH /api/v1/templates/categories/:id
router.patch("/categories/:id", requireAuth, requirePermission("admin:manage"), async (req, res, next): Promise<void> => {
  try {
    const id = String(req.params["id"]);
    const body = CategoryTemplateSchema.partial().safeParse(req.body);
    if (!body.success) return next(new ValidationError("Invalid input", body.error.flatten()));
    const [updated] = await db.update(categoryTemplatesTable).set({ ...body.data, updatedAt: new Date() }).where(eq(categoryTemplatesTable.id, id)).returning();
    if (!updated) return next(new NotFoundError("Category template", id));
    sendSuccess(res, updated);
  } catch (err) { next(err); }
});

// DELETE /api/v1/templates/categories/:id
router.delete("/categories/:id", requireAuth, requirePermission("admin:manage"), async (req, res, next): Promise<void> => {
  try {
    const id = String(req.params["id"]);
    await db.update(categoryTemplatesTable).set({ deletedAt: new Date(), isActive: false }).where(eq(categoryTemplatesTable.id, id));
    sendNoContent(res);
  } catch (err) { next(err); }
});

// POST /api/v1/templates/categories/:id/set-marketplace-default
router.post("/categories/:id/set-marketplace-default", requireAuth, requirePermission("admin:manage"), requireMarketplace, async (req, res, next): Promise<void> => {
  try {
    const templateId = String(req.params["id"]);
    const marketplace = req.marketplace!;
    const { hideRoot, startDepth } = z.object({
      hideRoot: z.boolean().default(true),
      startDepth: z.number().int().min(0).default(1),
    }).parse(req.body);

    const [upserted] = await db.insert(categoryTemplateMarketplaceConfigsTable)
      .values({ marketplaceId: marketplace.id, templateId, hideRoot, startDepth })
      .onConflictDoUpdate({
        target: [categoryTemplateMarketplaceConfigsTable.marketplaceId],
        set: { templateId, hideRoot, startDepth, updatedAt: new Date() },
      }).returning();
    sendSuccess(res, upserted);
  } catch (err) { next(err); }
});

export default router;
