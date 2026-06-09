import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { marketplacesTable } from "./marketplaces";

export const marketplaceMembershipsTable = pgTable(
  "marketplace_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    marketplaceId: uuid("marketplace_id")
      .notNull()
      .references(() => marketplacesTable.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id),
    status: text("status").notNull().default("active"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("marketplace_memberships_mp_user_idx").on(t.marketplaceId, t.userId),
    index("marketplace_memberships_user_id_idx").on(t.userId),
    index("marketplace_memberships_status_idx").on(t.status),
  ],
);

export const marketplaceUserPreferencesTable = pgTable(
  "marketplace_user_preferences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    marketplaceId: uuid("marketplace_id")
      .notNull()
      .references(() => marketplacesTable.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id),
    preferences: jsonb("preferences").notNull().default({}),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("marketplace_user_prefs_mp_user_idx").on(t.marketplaceId, t.userId),
  ],
);

export type MarketplaceMembership = typeof marketplaceMembershipsTable.$inferSelect;
export type InsertMarketplaceMembership = typeof marketplaceMembershipsTable.$inferInsert;

export type MarketplaceUserPreference = typeof marketplaceUserPreferencesTable.$inferSelect;
export type InsertMarketplaceUserPreference = typeof marketplaceUserPreferencesTable.$inferInsert;
