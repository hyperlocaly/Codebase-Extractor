import {
  pgTable,
  text,
  boolean,
  uuid,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { countriesTable, currenciesTable } from "./foundation";
import { categoriesTable } from "./categories";

export const marketplacesTable = pgTable(
  "marketplaces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizationsTable.id),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    tagline: text("tagline"),
    description: text("description"),
    countryId: uuid("country_id")
      .notNull()
      .references(() => countriesTable.id),
    currencyId: uuid("currency_id")
      .notNull()
      .references(() => currenciesTable.id),
    rootCategoryId: uuid("root_category_id").references(() => categoriesTable.id),
    status: text("status").notNull().default("draft"),
    domain: text("domain"),
    logoUrl: text("logo_url"),
    faviconUrl: text("favicon_url"),
    primaryColor: text("primary_color"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("marketplaces_slug_idx").on(t.slug),
    index("marketplaces_organization_id_idx").on(t.organizationId),
    index("marketplaces_status_idx").on(t.status),
  ],
);

export const marketplaceSettingSchemasTable = pgTable(
  "marketplace_setting_schemas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    marketplaceId: uuid("marketplace_id")
      .notNull()
      .references(() => marketplacesTable.id),
    key: text("key").notNull(),
    schema: jsonb("schema").notNull().default({}),
    defaultValue: jsonb("default_value"),
    isRequired: boolean("is_required").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("marketplace_setting_schemas_mp_key_idx").on(t.marketplaceId, t.key),
  ],
);

export const marketplaceSettingsTable = pgTable(
  "marketplace_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    marketplaceId: uuid("marketplace_id")
      .notNull()
      .references(() => marketplacesTable.id),
    key: text("key").notNull(),
    value: jsonb("value").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("marketplace_settings_mp_key_idx").on(t.marketplaceId, t.key),
  ],
);

export type Marketplace = typeof marketplacesTable.$inferSelect;
export type InsertMarketplace = typeof marketplacesTable.$inferInsert;

export type MarketplaceSettingSchema = typeof marketplaceSettingSchemasTable.$inferSelect;
export type InsertMarketplaceSettingSchema = typeof marketplaceSettingSchemasTable.$inferInsert;

export type MarketplaceSetting = typeof marketplaceSettingsTable.$inferSelect;
export type InsertMarketplaceSetting = typeof marketplaceSettingsTable.$inferInsert;
