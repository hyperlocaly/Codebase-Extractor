import { eq, and, isNull } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  locationTemplatesTable,
  locationTemplateMarketplaceConfigsTable,
  categoryTemplatesTable,
  categoryTemplateMarketplaceConfigsTable,
  countriesTable,
  marketplacesTable,
  categoriesTable,
} from "@workspace/db";
import { withDb, log, logDone } from "./seed-utils";

const MP_SLUG = "fashion-nigeria";

export async function seedTemplates() {
  await withDb(async () => {
    // ── Nigeria Location Template ──────────────────────────────────────────────
    const [nigeria] = await db
      .select({ id: countriesTable.id })
      .from(countriesTable)
      .where(eq(countriesTable.isoCode, "NG"));

    if (!nigeria) {
      log("Country NG not found, skipping location template seed");
      return;
    }

    const [existingLocTemplate] = await db
      .select({ id: locationTemplatesTable.id })
      .from(locationTemplatesTable)
      .where(
        and(
          eq(locationTemplatesTable.slug, "nigeria-states-lgas"),
          isNull(locationTemplatesTable.deletedAt),
        ),
      );

    let locationTemplateId: string;

    if (existingLocTemplate) {
      locationTemplateId = existingLocTemplate.id;
      log("Location template nigeria-states-lgas already exists, skipping");
    } else {
      const [locTemplate] = await db
        .insert(locationTemplatesTable)
        .values({
          name: "Nigeria: States → LGAs → Towns",
          slug: "nigeria-states-lgas",
          countryId: nigeria.id,
          description:
            "Nigerian location hierarchy: 10 states → 36 LGAs → 121 towns. Used by Fashion Nigeria marketplace.",
          isActive: true,
          isDefault: true,
        })
        .returning();
      locationTemplateId = locTemplate!.id;
      log(`Created location template: ${locTemplate!.slug} (${locTemplate!.id})`);
    }

    // ── Link location template to Fashion Nigeria ──────────────────────────────
    const [mp] = await db
      .select({ id: marketplacesTable.id })
      .from(marketplacesTable)
      .where(eq(marketplacesTable.slug, MP_SLUG));

    if (!mp) {
      log("Fashion Nigeria marketplace not found, skipping marketplace config");
      return;
    }

    await db
      .insert(locationTemplateMarketplaceConfigsTable)
      .values({
        marketplaceId: mp.id,
        templateId: locationTemplateId,
        defaultStartLevel: 1, // Start at State level
        hiddenLevels: [],     // Show all levels (state, LGA, town)
        isActive: true,
      })
      .onConflictDoUpdate({
        target: [locationTemplateMarketplaceConfigsTable.marketplaceId],
        set: {
          templateId: locationTemplateId,
          defaultStartLevel: 1,
          hiddenLevels: [],
          isActive: true,
          updatedAt: new Date(),
        },
      });

    log(`Linked location template to marketplace: ${MP_SLUG}`);

    // ── Fashion Category Template ──────────────────────────────────────────────
    const [fashionRoot] = await db
      .select({ id: categoriesTable.id })
      .from(categoriesTable)
      .where(
        and(
          eq(categoriesTable.slug, "fashion-tailoring"),
          isNull(categoriesTable.parentId),
        ),
      );

    if (!fashionRoot) {
      log("Fashion root category not found, skipping category template seed");
      return;
    }

    const [existingCatTemplate] = await db
      .select({ id: categoryTemplatesTable.id })
      .from(categoryTemplatesTable)
      .where(
        and(
          eq(categoryTemplatesTable.slug, "fashion-nigeria-categories"),
          isNull(categoryTemplatesTable.deletedAt),
        ),
      );

    let categoryTemplateId: string;

    if (existingCatTemplate) {
      categoryTemplateId = existingCatTemplate.id;
      log("Category template fashion-nigeria-categories already exists, skipping");
    } else {
      const [catTemplate] = await db
        .insert(categoryTemplatesTable)
        .values({
          name: "Fashion Nigeria: Tailors & Designers",
          slug: "fashion-nigeria-categories",
          rootCategoryId: fashionRoot.id,
          description:
            "Fashion category tree for Fashion Nigeria marketplace. Root is hidden; users browse from depth-1 categories (e.g. Tailoring, Ready-to-Wear).",
          displayConfig: {
            rootLabel: "Fashion Category",
            depth1Label: "Specialty",
            depth2Label: "Sub-specialty",
            showRootInBreadcrumb: false,
          },
          isActive: true,
        })
        .returning();
      categoryTemplateId = catTemplate!.id;
      log(`Created category template: ${catTemplate!.slug} (${catTemplate!.id})`);
    }

    // ── Link category template to Fashion Nigeria ──────────────────────────────
    await db
      .insert(categoryTemplateMarketplaceConfigsTable)
      .values({
        marketplaceId: mp.id,
        templateId: categoryTemplateId,
        hideRoot: true,
        startDepth: 1,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: [categoryTemplateMarketplaceConfigsTable.marketplaceId],
        set: {
          templateId: categoryTemplateId,
          hideRoot: true,
          startDepth: 1,
          isActive: true,
          updatedAt: new Date(),
        },
      });

    log(`Linked category template to marketplace: ${MP_SLUG}`);
    logDone("templates", 2, 0);
  });
}

seedTemplates().catch((err) => {
  console.error("Template seed failed:", err);
  process.exit(1);
});
