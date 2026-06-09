import {
  pgTable,
  text,
  uuid,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { businessesTable } from "./businesses";

export const businessUpdatesTable = pgTable(
  "business_updates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businessesTable.id),
    title: text("title").notNull(),
    body: text("body").notNull(),
    updateType: text("update_type").notNull().default("announcement"),
    status: text("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("business_updates_business_id_idx").on(t.businessId),
    index("business_updates_status_idx").on(t.status),
    index("business_updates_type_idx").on(t.updateType),
    index("business_updates_published_at_idx").on(t.publishedAt),
  ],
);

export type BusinessUpdate = typeof businessUpdatesTable.$inferSelect;
export type InsertBusinessUpdate = typeof businessUpdatesTable.$inferInsert;
