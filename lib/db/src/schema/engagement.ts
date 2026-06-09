import {
  pgTable,
  text,
  uuid,
  integer,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { marketplacesTable } from "./marketplaces";
import { businessesTable } from "./businesses";

export const savedItemsTable = pgTable(
  "saved_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id),
    marketplaceId: uuid("marketplace_id")
      .notNull()
      .references(() => marketplacesTable.id),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("saved_items_user_entity_idx").on(t.userId, t.entityType, t.entityId),
    index("saved_items_user_id_idx").on(t.userId),
    index("saved_items_marketplace_id_idx").on(t.marketplaceId),
    index("saved_items_entity_idx").on(t.entityType, t.entityId),
  ],
);

export const engagementEventsTable = pgTable(
  "engagement_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    marketplaceId: uuid("marketplace_id")
      .notNull()
      .references(() => marketplacesTable.id),
    businessId: uuid("business_id").references(() => businessesTable.id),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    eventType: text("event_type").notNull(),
    sessionId: text("session_id"),
    userId: uuid("user_id").references(() => usersTable.id),
    ipAddress: text("ip_address"),
    metadata: jsonb("metadata").notNull().default({}),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("engagement_events_marketplace_id_idx").on(t.marketplaceId),
    index("engagement_events_business_id_idx").on(t.businessId),
    index("engagement_events_type_idx").on(t.eventType),
    index("engagement_events_occurred_at_idx").on(t.occurredAt),
    index("engagement_events_entity_idx").on(t.entityType, t.entityId),
  ],
);

export const notificationsTable = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id),
    marketplaceId: uuid("marketplace_id").references(() => marketplacesTable.id),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    channel: text("channel").notNull().default("in_app"),
    status: text("status").notNull().default("pending"),
    entityType: text("entity_type"),
    entityId: uuid("entity_id"),
    actionUrl: text("action_url"),
    metadata: jsonb("metadata").notNull().default({}),
    attemptCount: integer("attempt_count").notNull().default(0),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
    lastError: text("last_error"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("notifications_user_id_idx").on(t.userId),
    index("notifications_status_idx").on(t.status),
    index("notifications_channel_status_idx").on(t.channel, t.status),
    index("notifications_marketplace_id_idx").on(t.marketplaceId),
    index("notifications_created_at_idx").on(t.createdAt),
  ],
);

export type SavedItem = typeof savedItemsTable.$inferSelect;
export type InsertSavedItem = typeof savedItemsTable.$inferInsert;

export type EngagementEvent = typeof engagementEventsTable.$inferSelect;
export type InsertEngagementEvent = typeof engagementEventsTable.$inferInsert;

export type Notification = typeof notificationsTable.$inferSelect;
export type InsertNotification = typeof notificationsTable.$inferInsert;
