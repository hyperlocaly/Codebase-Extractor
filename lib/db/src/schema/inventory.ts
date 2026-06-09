import {
  pgTable,
  text,
  boolean,
  uuid,
  numeric,
  smallint,
  integer,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { businessesTable } from "./businesses";
import { currenciesTable } from "./foundation";
import { categoriesTable } from "./categories";

export const productsTable = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businessesTable.id),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    price: numeric("price", { precision: 15, scale: 2 }),
    currencyId: uuid("currency_id").references(() => currenciesTable.id),
    unit: text("unit"),
    imageUrl: text("image_url"),
    stockStatus: text("stock_status").notNull().default("in_stock"),
    categoryId: uuid("category_id").references(() => categoriesTable.id),
    status: text("status").notNull().default("draft"),
    sortOrder: smallint("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("products_biz_slug_active_idx")
      .on(t.businessId, t.slug)
      .where(sql`deleted_at IS NULL`),
    index("products_business_id_idx").on(t.businessId),
    index("products_status_idx").on(t.status),
    index("products_category_id_idx").on(t.categoryId),
  ],
);

export const servicesTable = pgTable(
  "services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businessesTable.id),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    priceFrom: numeric("price_from", { precision: 15, scale: 2 }),
    priceTo: numeric("price_to", { precision: 15, scale: 2 }),
    currencyId: uuid("currency_id").references(() => currenciesTable.id),
    imageUrl: text("image_url"),
    durationMinutes: integer("duration_minutes"),
    availability: text("availability"),
    categoryId: uuid("category_id").references(() => categoriesTable.id),
    status: text("status").notNull().default("draft"),
    sortOrder: smallint("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("services_biz_slug_active_idx")
      .on(t.businessId, t.slug)
      .where(sql`deleted_at IS NULL`),
    index("services_business_id_idx").on(t.businessId),
    index("services_status_idx").on(t.status),
    index("services_category_id_idx").on(t.categoryId),
  ],
);

export type Product = typeof productsTable.$inferSelect;
export type InsertProduct = typeof productsTable.$inferInsert;

export type Service = typeof servicesTable.$inferSelect;
export type InsertService = typeof servicesTable.$inferInsert;
