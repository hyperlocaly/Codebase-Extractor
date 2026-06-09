import {
  pgTable,
  text,
  uuid,
  smallint,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { businessesTable } from "./businesses";

export const portfoliosTable = pgTable(
  "portfolios",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businessesTable.id),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status").notNull().default("draft"),
    sortOrder: smallint("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("portfolios_business_id_idx").on(t.businessId),
    index("portfolios_status_idx").on(t.status),
  ],
);

export const portfolioItemsTable = pgTable(
  "portfolio_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    portfolioId: uuid("portfolio_id")
      .notNull()
      .references(() => portfoliosTable.id),
    mediaUrl: text("media_url").notNull(),
    thumbnailUrl: text("thumbnail_url"),
    caption: text("caption"),
    sortOrder: smallint("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("portfolio_items_portfolio_id_idx").on(t.portfolioId),
  ],
);

export type Portfolio = typeof portfoliosTable.$inferSelect;
export type InsertPortfolio = typeof portfoliosTable.$inferInsert;

export type PortfolioItem = typeof portfolioItemsTable.$inferSelect;
export type InsertPortfolioItem = typeof portfolioItemsTable.$inferInsert;
