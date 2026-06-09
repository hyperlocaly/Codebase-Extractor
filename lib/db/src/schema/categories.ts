import {
  pgTable,
  text,
  boolean,
  uuid,
  smallint,
  timestamp,
  uniqueIndex,
  index,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

export const categoriesTable = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    parentId: uuid("parent_id").references((): AnyPgColumn => categoriesTable.id),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    iconUrl: text("icon_url"),
    depth: smallint("depth").notNull().default(0),
    sortOrder: smallint("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("categories_slug_parent_idx").on(t.slug, t.parentId),
    index("categories_parent_id_idx").on(t.parentId),
    index("categories_depth_idx").on(t.depth),
    index("categories_is_active_idx").on(t.isActive),
  ],
);

export type Category = typeof categoriesTable.$inferSelect;
export type InsertCategory = typeof categoriesTable.$inferInsert;
