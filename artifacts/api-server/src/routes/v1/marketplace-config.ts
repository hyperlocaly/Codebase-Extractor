import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  marketplacesTable,
  countriesTable,
  locationTemplatesTable,
  locationTemplateMarketplaceConfigsTable,
  locationLevelDefinitionsTable,
  categoryTemplatesTable,
  categoryTemplateMarketplaceConfigsTable,
  categoriesTable,
} from "@workspace/db";
import { requireMarketplace } from "../../middleware/marketplace-context";
import { sendSuccess } from "../../shared/response";
import { NotFoundError } from "../../shared/errors";

const router: IRouter = Router();

/**
 * GET /api/v1/marketplaces/:slug/location-config
 * Returns the location configuration for a marketplace:
 *  - country
 *  - default location template (if set)
 *  - selectable levels
 *  - hidden levels
 */
router.get("/:slug/location-config", requireMarketplace, async (req, res, next): Promise<void> => {
  try {
    const marketplace = req.marketplace!;

    // Get country + level definitions
    const [country] = await db
      .select({
        id: countriesTable.id,
        name: countriesTable.name,
        isoCode: countriesTable.isoCode,
        phoneCode: countriesTable.phoneCode,
      })
      .from(countriesTable)
      .where(eq(countriesTable.id, marketplace.countryId));

    const levelDefs = await db
      .select({
        levelNumber: locationLevelDefinitionsTable.levelNumber,
        label: locationLevelDefinitionsTable.label,
      })
      .from(locationLevelDefinitionsTable)
      .where(eq(locationLevelDefinitionsTable.countryId, marketplace.countryId))
      .orderBy(locationLevelDefinitionsTable.levelNumber);

    // Get template config if set
    const [templateConfig] = await db
      .select({
        id: locationTemplateMarketplaceConfigsTable.id,
        defaultStartLevel: locationTemplateMarketplaceConfigsTable.defaultStartLevel,
        hiddenLevels: locationTemplateMarketplaceConfigsTable.hiddenLevels,
        template: {
          id: locationTemplatesTable.id,
          name: locationTemplatesTable.name,
          slug: locationTemplatesTable.slug,
        },
      })
      .from(locationTemplateMarketplaceConfigsTable)
      .innerJoin(locationTemplatesTable, eq(locationTemplateMarketplaceConfigsTable.templateId, locationTemplatesTable.id))
      .where(
        and(
          eq(locationTemplateMarketplaceConfigsTable.marketplaceId, marketplace.id),
          eq(locationTemplateMarketplaceConfigsTable.isActive, true),
        ),
      );

    const hiddenLevels: number[] = (templateConfig?.hiddenLevels as number[] | null) ?? [];
    const defaultStartLevel = templateConfig?.defaultStartLevel ?? 1;

    const selectableLevels = levelDefs
      .filter((l) => !hiddenLevels.includes(l.levelNumber))
      .map((l) => ({ ...l, isDefault: l.levelNumber === defaultStartLevel }));

    const hiddenLevelDefs = levelDefs.filter((l) => hiddenLevels.includes(l.levelNumber));

    sendSuccess(res, {
      marketplace: { id: marketplace.id, slug: marketplace.slug, name: marketplace.name },
      country,
      locationTemplate: templateConfig?.template ?? null,
      defaultStartLevel,
      selectableLevels,
      hiddenLevels: hiddenLevelDefs,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/marketplaces/:slug/category-config
 * Returns the category template configuration for a marketplace.
 */
router.get("/:slug/category-config", requireMarketplace, async (req, res, next): Promise<void> => {
  try {
    const marketplace = req.marketplace!;

    const [templateConfig] = await db
      .select({
        id: categoryTemplateMarketplaceConfigsTable.id,
        hideRoot: categoryTemplateMarketplaceConfigsTable.hideRoot,
        startDepth: categoryTemplateMarketplaceConfigsTable.startDepth,
        template: {
          id: categoryTemplatesTable.id,
          name: categoryTemplatesTable.name,
          slug: categoryTemplatesTable.slug,
          displayConfig: categoryTemplatesTable.displayConfig,
        },
        rootCategory: {
          id: categoriesTable.id,
          name: categoriesTable.name,
          slug: categoriesTable.slug,
        },
      })
      .from(categoryTemplateMarketplaceConfigsTable)
      .innerJoin(categoryTemplatesTable, eq(categoryTemplateMarketplaceConfigsTable.templateId, categoryTemplatesTable.id))
      .innerJoin(categoriesTable, eq(categoryTemplatesTable.rootCategoryId, categoriesTable.id))
      .where(
        and(
          eq(categoryTemplateMarketplaceConfigsTable.marketplaceId, marketplace.id),
          eq(categoryTemplateMarketplaceConfigsTable.isActive, true),
        ),
      );

    sendSuccess(res, {
      marketplace: { id: marketplace.id, slug: marketplace.slug, name: marketplace.name },
      categoryTemplate: templateConfig?.template ?? null,
      rootCategory: templateConfig?.rootCategory ?? null,
      hideRoot: templateConfig?.hideRoot ?? false,
      startDepth: templateConfig?.startDepth ?? 0,
      instructions: templateConfig
        ? `Users start selection at depth ${templateConfig.startDepth}${templateConfig.hideRoot ? " (root category is hidden)" : ""}`
        : "No category template configured — show full category tree",
    });
  } catch (err) {
    next(err);
  }
});

export default router;
