import {
  pgTable,
  text,
  boolean,
  uuid,
  smallint,
  numeric,
  timestamp,
  uniqueIndex,
  index,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { countriesTable } from "./foundation";

export const locationsTable = pgTable(
  "locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    countryId: uuid("country_id")
      .notNull()
      .references(() => countriesTable.id),
    parentId: uuid("parent_id").references((): AnyPgColumn => locationsTable.id),
    levelNumber: smallint("level_number").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    fullName: text("full_name").notNull(),
    latitude: numeric("latitude", { precision: 10, scale: 7 }),
    longitude: numeric("longitude", { precision: 10, scale: 7 }),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: smallint("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("locations_slug_country_idx").on(t.slug, t.countryId),
    index("locations_parent_id_idx").on(t.parentId),
    index("locations_country_level_idx").on(t.countryId, t.levelNumber),
    index("locations_is_active_idx").on(t.isActive),
  ],
);

export type Location = typeof locationsTable.$inferSelect;
export type InsertLocation = typeof locationsTable.$inferInsert;
