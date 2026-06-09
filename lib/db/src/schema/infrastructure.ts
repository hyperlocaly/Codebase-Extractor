import {
  pgTable,
  text,
  uuid,
  integer,
  smallint,
  jsonb,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { marketplacesTable } from "./marketplaces";
import { usersTable } from "./users";

export const domainEventOutboxTable = pgTable(
  "domain_event_outbox",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventType: text("event_type").notNull(),
    aggregateType: text("aggregate_type").notNull(),
    aggregateId: uuid("aggregate_id").notNull(),
    payload: jsonb("payload").notNull(),
    partitionKey: text("partition_key").notNull(),
    status: text("status").notNull().default("pending"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    retryCount: integer("retry_count").notNull().default(0),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("outbox_status_created_at_idx").on(t.status, t.createdAt),
    index("outbox_aggregate_idx").on(t.aggregateType, t.aggregateId),
    index("outbox_partition_key_idx").on(t.partitionKey),
    index("outbox_event_type_idx").on(t.eventType),
  ],
);

export const eventTypeRegistryTable = pgTable(
  "event_type_registry",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventType: text("event_type").notNull(),
    aggregateType: text("aggregate_type").notNull(),
    schemaVersion: integer("schema_version").notNull().default(1),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("event_type_registry_type_idx").on(t.eventType)],
);

export const consumerCheckpointsTable = pgTable(
  "consumer_checkpoints",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    consumerName: text("consumer_name").notNull(),
    lastEventId: uuid("last_event_id"),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("consumer_checkpoints_name_idx").on(t.consumerName)],
);

export const backgroundJobsTable = pgTable(
  "background_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobType: text("job_type").notNull(),
    status: text("status").notNull().default("pending"),
    payload: jsonb("payload").notNull().default({}),
    priority: smallint("priority").notNull().default(5),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull().defaultNow(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    retryCount: integer("retry_count").notNull().default(0),
    maxRetries: integer("max_retries").notNull().default(3),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("background_jobs_status_priority_idx").on(t.status, t.priority),
    index("background_jobs_scheduled_for_idx").on(t.scheduledFor),
    index("background_jobs_job_type_idx").on(t.jobType),
  ],
);

export const auditLogsTable = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    marketplaceId: uuid("marketplace_id").references(() => marketplacesTable.id),
    userId: uuid("user_id").references(() => usersTable.id),
    action: text("action").notNull(),
    entityType: text("entity_type"),
    entityId: uuid("entity_id"),
    oldValue: jsonb("old_value"),
    newValue: jsonb("new_value"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_logs_marketplace_id_idx").on(t.marketplaceId),
    index("audit_logs_user_id_idx").on(t.userId),
    index("audit_logs_entity_idx").on(t.entityType, t.entityId),
    index("audit_logs_created_at_idx").on(t.createdAt),
    index("audit_logs_action_idx").on(t.action),
  ],
);

export const deadLetterEventsTable = pgTable(
  "dead_letter_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    originalEventId: uuid("original_event_id").notNull(),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").notNull(),
    failureReason: text("failure_reason").notNull(),
    retryCount: integer("retry_count").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("dead_letter_events_event_type_idx").on(t.eventType),
    index("dead_letter_events_original_id_idx").on(t.originalEventId),
    index("dead_letter_events_created_at_idx").on(t.createdAt),
  ],
);

export const idempotencyKeysTable = pgTable(
  "idempotency_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    idempotencyKey: text("idempotency_key").notNull(),
    userId: uuid("user_id").references(() => usersTable.id),
    requestHash: text("request_hash").notNull(),
    responseStatus: integer("response_status").notNull(),
    responseBody: jsonb("response_body").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("idempotency_keys_key_user_idx").on(t.idempotencyKey, t.userId),
    index("idempotency_keys_expires_at_idx").on(t.expiresAt),
  ],
);

export const moderationActionsTable = pgTable(
  "moderation_actions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    oldStatus: text("old_status"),
    newStatus: text("new_status"),
    reason: text("reason"),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => usersTable.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("moderation_actions_entity_idx").on(t.entityType, t.entityId),
    index("moderation_actions_actor_id_idx").on(t.actorId),
    index("moderation_actions_created_at_idx").on(t.createdAt),
  ],
);

export type DomainEventOutbox = typeof domainEventOutboxTable.$inferSelect;
export type InsertDomainEventOutbox = typeof domainEventOutboxTable.$inferInsert;

export type EventTypeRegistry = typeof eventTypeRegistryTable.$inferSelect;
export type InsertEventTypeRegistry = typeof eventTypeRegistryTable.$inferInsert;

export type ConsumerCheckpoint = typeof consumerCheckpointsTable.$inferSelect;
export type InsertConsumerCheckpoint = typeof consumerCheckpointsTable.$inferInsert;

export type BackgroundJob = typeof backgroundJobsTable.$inferSelect;
export type InsertBackgroundJob = typeof backgroundJobsTable.$inferInsert;

export type AuditLog = typeof auditLogsTable.$inferSelect;
export type InsertAuditLog = typeof auditLogsTable.$inferInsert;

export type DeadLetterEvent = typeof deadLetterEventsTable.$inferSelect;
export type InsertDeadLetterEvent = typeof deadLetterEventsTable.$inferInsert;

export type IdempotencyKey = typeof idempotencyKeysTable.$inferSelect;
export type InsertIdempotencyKey = typeof idempotencyKeysTable.$inferInsert;

export type ModerationAction = typeof moderationActionsTable.$inferSelect;
export type InsertModerationAction = typeof moderationActionsTable.$inferInsert;
