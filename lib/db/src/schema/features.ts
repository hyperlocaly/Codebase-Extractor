import {
  pgTable,
  text,
  boolean,
  uuid,
  smallint,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { marketplacesTable } from "./marketplaces";

export const globalFeaturesTable = pgTable(
  "global_features",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    appliesToEntityTypes: jsonb("applies_to_entity_types").notNull().default([]),
    isSystem: boolean("is_system").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("global_features_code_idx").on(t.code)],
);

export const featuresTable = pgTable(
  "features",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    marketplaceId: uuid("marketplace_id")
      .notNull()
      .references(() => marketplacesTable.id),
    globalFeatureId: uuid("global_feature_id").references(() => globalFeaturesTable.id),
    name: text("name").notNull(),
    code: text("code").notNull(),
    appliesToEntityType: text("applies_to_entity_type").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: smallint("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("features_mp_code_idx").on(t.marketplaceId, t.code),
    index("features_marketplace_id_idx").on(t.marketplaceId),
    index("features_applies_to_idx").on(t.appliesToEntityType),
  ],
);

export const featureAssignmentsTable = pgTable(
  "feature_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    featureId: uuid("feature_id")
      .notNull()
      .references(() => featuresTable.id),
    value: jsonb("value"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("feature_assignments_entity_feature_idx").on(t.entityType, t.entityId, t.featureId),
    index("feature_assignments_entity_id_idx").on(t.entityId),
    index("feature_assignments_feature_id_idx").on(t.featureId),
  ],
);

export type GlobalFeature = typeof globalFeaturesTable.$inferSelect;
export type InsertGlobalFeature = typeof globalFeaturesTable.$inferInsert;

export type Feature = typeof featuresTable.$inferSelect;
export type InsertFeature = typeof featuresTable.$inferInsert;

export type FeatureAssignment = typeof featureAssignmentsTable.$inferSelect;
export type InsertFeatureAssignment = typeof featureAssignmentsTable.$inferInsert;
