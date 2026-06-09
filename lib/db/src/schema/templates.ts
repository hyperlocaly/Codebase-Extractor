import {
  pgTable,
  text,
  boolean,
  uuid,
  smallint,
  integer,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { countriesTable } from "./foundation";
import { marketplacesTable } from "./marketplaces";
import { categoriesTable } from "./categories";
import { usersTable } from "./users";

// ── Location Templates ────────────────────────────────────────────────────────

export const locationTemplatesTable = pgTable(
  "location_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    countryId: uuid("country_id")
      .notNull()
      .references(() => countriesTable.id),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    isDefault: boolean("is_default").notNull().default(false),
    createdBy: uuid("created_by").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("location_templates_country_idx").on(t.countryId),
    index("location_templates_is_active_idx").on(t.isActive),
  ],
);

export const locationTemplateMarketplaceConfigsTable = pgTable(
  "location_template_marketplace_configs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    marketplaceId: uuid("marketplace_id")
      .notNull()
      .references(() => marketplacesTable.id),
    templateId: uuid("template_id")
      .notNull()
      .references(() => locationTemplatesTable.id),
    defaultStartLevel: smallint("default_start_level").notNull().default(1),
    hiddenLevels: jsonb("hidden_levels").$type<number[]>().default([]),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("loc_tmpl_mp_config_mp_idx").on(t.marketplaceId),
    index("loc_tmpl_mp_config_template_idx").on(t.templateId),
  ],
);

// ── Category Templates ────────────────────────────────────────────────────────

export const categoryTemplatesTable = pgTable(
  "category_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    rootCategoryId: uuid("root_category_id")
      .notNull()
      .references(() => categoriesTable.id),
    description: text("description"),
    displayConfig: jsonb("display_config")
      .$type<{
        rootLabel?: string;
        depth1Label?: string;
        depth2Label?: string;
        showRootInBreadcrumb?: boolean;
      }>()
      .default({}),
    isActive: boolean("is_active").notNull().default(true),
    createdBy: uuid("created_by").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("category_templates_root_idx").on(t.rootCategoryId),
    index("category_templates_is_active_idx").on(t.isActive),
  ],
);

export const categoryTemplateMarketplaceConfigsTable = pgTable(
  "category_template_marketplace_configs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    marketplaceId: uuid("marketplace_id")
      .notNull()
      .references(() => marketplacesTable.id),
    templateId: uuid("template_id")
      .notNull()
      .references(() => categoryTemplatesTable.id),
    hideRoot: boolean("hide_root").notNull().default(true),
    startDepth: smallint("start_depth").notNull().default(1),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("cat_tmpl_mp_config_mp_idx").on(t.marketplaceId),
    index("cat_tmpl_mp_config_template_idx").on(t.templateId),
  ],
);

export type LocationTemplate = typeof locationTemplatesTable.$inferSelect;
export type InsertLocationTemplate =
  typeof locationTemplatesTable.$inferInsert;
export type LocationTemplateMarketplaceConfig =
  typeof locationTemplateMarketplaceConfigsTable.$inferSelect;
export type CategoryTemplate = typeof categoryTemplatesTable.$inferSelect;
export type InsertCategoryTemplate =
  typeof categoryTemplatesTable.$inferInsert;
export type CategoryTemplateMarketplaceConfig =
  typeof categoryTemplateMarketplaceConfigsTable.$inferSelect;
