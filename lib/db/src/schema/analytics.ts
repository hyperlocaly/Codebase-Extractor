import {
  pgTable,
  text,
  boolean,
  uuid,
  numeric,
  integer,
  jsonb,
  timestamp,
  date,
  customType,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { marketplacesTable } from "./marketplaces";
import { businessesTable } from "./businesses";
import { locationsTable } from "./locations";
import { categoriesTable } from "./categories";
import { usersTable } from "./users";

const tsvector = customType<{ data: string; driverData: string }>({
  dataType() {
    return "tsvector";
  },
});

export const searchLogsTable = pgTable(
  "search_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    marketplaceId: uuid("marketplace_id")
      .notNull()
      .references(() => marketplacesTable.id),
    query: text("query"),
    filters: jsonb("filters").notNull().default({}),
    resultCount: integer("result_count").notNull().default(0),
    userId: uuid("user_id").references(() => usersTable.id),
    sessionId: text("session_id"),
    ipAddress: text("ip_address"),
    latencyMs: integer("latency_ms"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("search_logs_marketplace_id_idx").on(t.marketplaceId),
    index("search_logs_created_at_idx").on(t.createdAt),
    index("search_logs_zero_results_idx").on(t.marketplaceId, t.resultCount),
  ],
);

export const businessAnalyticsDailyTable = pgTable(
  "business_analytics_daily",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businessesTable.id),
    date: date("date").notNull(),
    profileViews: integer("profile_views").notNull().default(0),
    whatsappClicks: integer("whatsapp_clicks").notNull().default(0),
    callClicks: integer("call_clicks").notNull().default(0),
    shareClicks: integer("share_clicks").notNull().default(0),
    saves: integer("saves").notNull().default(0),
    productViews: integer("product_views").notNull().default(0),
    serviceViews: integer("service_views").notNull().default(0),
    portfolioViews: integer("portfolio_views").notNull().default(0),
    updateViews: integer("update_views").notNull().default(0),
    searchAppearances: integer("search_appearances").notNull().default(0),
    searchClicks: integer("search_clicks").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("business_analytics_daily_biz_date_idx").on(t.businessId, t.date),
    index("business_analytics_daily_date_idx").on(t.date),
  ],
);

export const marketplaceAnalyticsDailyTable = pgTable(
  "marketplace_analytics_daily",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    marketplaceId: uuid("marketplace_id")
      .notNull()
      .references(() => marketplacesTable.id),
    date: date("date").notNull(),
    totalSearches: integer("total_searches").notNull().default(0),
    zeroResultSearches: integer("zero_result_searches").notNull().default(0),
    uniqueSearchers: integer("unique_searchers").notNull().default(0),
    totalBusinesses: integer("total_businesses").notNull().default(0),
    newBusinesses: integer("new_businesses").notNull().default(0),
    activeBusinesses: integer("active_businesses").notNull().default(0),
    totalEngagements: integer("total_engagements").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("marketplace_analytics_daily_mp_date_idx").on(t.marketplaceId, t.date),
    index("marketplace_analytics_daily_date_idx").on(t.date),
  ],
);

export const businessListCacheTable = pgTable(
  "business_list_cache",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businessesTable.id),
    marketplaceId: uuid("marketplace_id")
      .notNull()
      .references(() => marketplacesTable.id),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    locationId: uuid("location_id").references(() => locationsTable.id),
    primaryCategoryId: uuid("primary_category_id").references(() => categoriesTable.id),
    verificationScore: numeric("verification_score", { precision: 5, scale: 2 }).notNull().default("0"),
    totalScore: numeric("total_score", { precision: 5, scale: 2 }).notNull().default("0"),
    claimStatus: text("claim_status").notNull().default("unclaimed"),
    status: text("status").notNull().default("active"),
    whatsappNumber: text("whatsapp_number"),
    primaryPhone: text("primary_phone"),
    primaryEmail: text("primary_email"),
    hasLogo: boolean("has_logo").notNull().default(false),
    logoUrl: text("logo_url"),
    latitude: numeric("latitude", { precision: 10, scale: 7 }),
    longitude: numeric("longitude", { precision: 10, scale: 7 }),
    lastEventAt: timestamp("last_event_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("business_list_cache_business_id_idx").on(t.businessId),
    index("business_list_cache_marketplace_id_idx").on(t.marketplaceId),
    index("business_list_cache_status_idx").on(t.marketplaceId, t.status),
    index("business_list_cache_location_idx").on(t.marketplaceId, t.locationId),
    index("business_list_cache_score_idx").on(t.marketplaceId, t.totalScore),
    index("business_list_cache_category_idx").on(t.marketplaceId, t.primaryCategoryId),
  ],
);

export const searchDocumentsTable = pgTable(
  "search_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    marketplaceId: uuid("marketplace_id")
      .notNull()
      .references(() => marketplacesTable.id),
    title: text("title").notNull(),
    description: text("description"),
    searchVector: tsvector("search_vector"),
    locationId: uuid("location_id").references(() => locationsTable.id),
    verificationScore: numeric("verification_score", { precision: 5, scale: 2 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("search_documents_entity_idx").on(t.entityType, t.entityId),
    index("search_documents_marketplace_id_idx").on(t.marketplaceId),
    index("search_documents_entity_type_idx").on(t.entityType),
    index("search_documents_location_id_idx").on(t.locationId),
  ],
);

export const searchSyncQueueTable = pgTable(
  "search_sync_queue",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    marketplaceId: uuid("marketplace_id")
      .notNull()
      .references(() => marketplacesTable.id),
    operation: text("operation").notNull().default("upsert"),
    attemptCount: integer("attempt_count").notNull().default(0),
    lastError: text("last_error"),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (t) => [
    index("search_sync_queue_entity_idx").on(t.entityType, t.entityId),
    index("search_sync_queue_next_attempt_idx").on(t.nextAttemptAt),
    index("search_sync_queue_processed_at_idx").on(t.processedAt),
    index("search_sync_queue_marketplace_id_idx").on(t.marketplaceId),
  ],
);

export type SearchLog = typeof searchLogsTable.$inferSelect;
export type InsertSearchLog = typeof searchLogsTable.$inferInsert;

export type BusinessAnalyticsDaily = typeof businessAnalyticsDailyTable.$inferSelect;
export type InsertBusinessAnalyticsDaily = typeof businessAnalyticsDailyTable.$inferInsert;

export type MarketplaceAnalyticsDaily = typeof marketplaceAnalyticsDailyTable.$inferSelect;
export type InsertMarketplaceAnalyticsDaily = typeof marketplaceAnalyticsDailyTable.$inferInsert;

export type BusinessListCache = typeof businessListCacheTable.$inferSelect;
export type InsertBusinessListCache = typeof businessListCacheTable.$inferInsert;

export type SearchDocument = typeof searchDocumentsTable.$inferSelect;
export type InsertSearchDocument = typeof searchDocumentsTable.$inferInsert;

export type SearchSyncQueue = typeof searchSyncQueueTable.$inferSelect;
export type InsertSearchSyncQueue = typeof searchSyncQueueTable.$inferInsert;
