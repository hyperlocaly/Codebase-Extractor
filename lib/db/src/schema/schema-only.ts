import {
  pgTable,
  text,
  uuid,
  numeric,
  integer,
  boolean,
  jsonb,
  timestamp,
  date,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { marketplacesTable } from "./marketplaces";
import { businessesTable } from "./businesses";
import { usersTable } from "./users";
import { currenciesTable } from "./foundation";

export const plansTable = pgTable(
  "plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    priceMonthly: numeric("price_monthly", { precision: 10, scale: 2 }),
    priceAnnual: numeric("price_annual", { precision: 10, scale: 2 }),
    isActive: boolean("is_active").notNull().default(true),
    features: jsonb("features").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("plans_slug_idx").on(t.slug)],
);

export const marketplaceSubscriptionsTable = pgTable(
  "marketplace_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    marketplaceId: uuid("marketplace_id")
      .notNull()
      .references(() => marketplacesTable.id),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plansTable.id),
    status: text("status").notNull().default("active"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("marketplace_subscriptions_marketplace_id_idx").on(t.marketplaceId),
    index("marketplace_subscriptions_status_idx").on(t.status),
  ],
);

export const usageCountersTable = pgTable(
  "usage_counters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    marketplaceId: uuid("marketplace_id")
      .notNull()
      .references(() => marketplacesTable.id),
    metricKey: text("metric_key").notNull(),
    value: integer("value").notNull().default(0),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("usage_counters_mp_key_period_idx").on(t.marketplaceId, t.metricKey, t.periodStart),
    index("usage_counters_marketplace_id_idx").on(t.marketplaceId),
  ],
);

export const marketplaceDomainsTable = pgTable(
  "marketplace_domains",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    marketplaceId: uuid("marketplace_id")
      .notNull()
      .references(() => marketplacesTable.id),
    domain: text("domain").notNull(),
    isPrimary: boolean("is_primary").notNull().default(false),
    isVerified: boolean("is_verified").notNull().default(false),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("marketplace_domains_domain_idx").on(t.domain),
    index("marketplace_domains_marketplace_id_idx").on(t.marketplaceId),
  ],
);

export const marketplaceBrandingTable = pgTable(
  "marketplace_branding",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    marketplaceId: uuid("marketplace_id")
      .notNull()
      .references(() => marketplacesTable.id),
    primaryColor: text("primary_color"),
    secondaryColor: text("secondary_color"),
    accentColor: text("accent_color"),
    fontFamily: text("font_family"),
    customCss: text("custom_css"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("marketplace_branding_marketplace_id_idx").on(t.marketplaceId)],
);

export const erasureRequestsTable = pgTable(
  "erasure_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id),
    status: text("status").notNull().default("pending"),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("erasure_requests_user_id_idx").on(t.userId),
    index("erasure_requests_status_idx").on(t.status),
  ],
);

export const enrichmentSuggestionsTable = pgTable(
  "enrichment_suggestions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businessesTable.id),
    fieldName: text("field_name").notNull(),
    suggestedValue: text("suggested_value").notNull(),
    source: text("source").notNull(),
    confidence: numeric("confidence", { precision: 5, scale: 4 }),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  },
  (t) => [
    index("enrichment_suggestions_business_id_idx").on(t.businessId),
    index("enrichment_suggestions_status_idx").on(t.status),
  ],
);

export const duplicateCandidatesTable = pgTable(
  "duplicate_candidates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceBusinessId: uuid("source_business_id")
      .notNull()
      .references(() => businessesTable.id),
    targetBusinessId: uuid("target_business_id")
      .notNull()
      .references(() => businessesTable.id),
    confidence: numeric("confidence", { precision: 5, scale: 4 }),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("duplicate_candidates_src_tgt_idx").on(t.sourceBusinessId, t.targetBusinessId),
    index("duplicate_candidates_status_idx").on(t.status),
  ],
);

export const businessMergesTable = pgTable(
  "business_merges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => businessesTable.id),
    targetId: uuid("target_id")
      .notNull()
      .references(() => businessesTable.id),
    mergedBy: uuid("merged_by").references(() => usersTable.id),
    mergedAt: timestamp("merged_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("business_merges_source_id_idx").on(t.sourceId),
    index("business_merges_target_id_idx").on(t.targetId),
  ],
);

export const exchangeRatesTable = pgTable(
  "exchange_rates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fromCurrencyId: uuid("from_currency_id")
      .notNull()
      .references(() => currenciesTable.id),
    toCurrencyId: uuid("to_currency_id")
      .notNull()
      .references(() => currenciesTable.id),
    rate: numeric("rate", { precision: 20, scale: 8 }).notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
    source: text("source").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("exchange_rates_from_to_idx").on(t.fromCurrencyId, t.toCurrencyId),
    index("exchange_rates_recorded_at_idx").on(t.recordedAt),
  ],
);

export const revenueEventsTable = pgTable(
  "revenue_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    marketplaceId: uuid("marketplace_id")
      .notNull()
      .references(() => marketplacesTable.id),
    eventType: text("event_type").notNull(),
    amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
    currencyId: uuid("currency_id")
      .notNull()
      .references(() => currenciesTable.id),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("revenue_events_marketplace_id_idx").on(t.marketplaceId),
    index("revenue_events_type_idx").on(t.eventType),
    index("revenue_events_created_at_idx").on(t.createdAt),
  ],
);
