import {
  pgTable,
  text,
  boolean,
  uuid,
  numeric,
  smallint,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { businessesTable } from "./businesses";
import { usersTable } from "./users";
import { marketplacesTable } from "./marketplaces";

export const verificationTypesTable = pgTable(
  "verification_types",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    marketplaceId: uuid("marketplace_id").references(() => marketplacesTable.id),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    weight: numeric("weight", { precision: 5, scale: 2 }).notNull().default("1"),
    appliesToEntityType: text("applies_to_entity_type").notNull().default("business"),
    isEnabled: boolean("is_enabled").notNull().default(true),
    sortOrder: smallint("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("verification_types_mp_code_idx").on(t.marketplaceId, t.code),
    index("verification_types_marketplace_id_idx").on(t.marketplaceId),
  ],
);

export const verificationRecordsTable = pgTable(
  "verification_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businessesTable.id),
    verificationTypeId: uuid("verification_type_id")
      .notNull()
      .references(() => verificationTypesTable.id),
    status: text("status").notNull().default("pending"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    verifierUserId: uuid("verifier_user_id").references(() => usersTable.id),
    evidenceUrl: text("evidence_url"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("verification_records_biz_type_idx").on(t.businessId, t.verificationTypeId),
    index("verification_records_business_id_idx").on(t.businessId),
    index("verification_records_status_idx").on(t.status),
  ],
);

export const verificationWorkflowsTable = pgTable(
  "verification_workflows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    verificationRecordId: uuid("verification_record_id")
      .notNull()
      .references(() => verificationRecordsTable.id),
    action: text("action").notNull(),
    actorId: uuid("actor_id").references(() => usersTable.id),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("verification_workflows_record_id_idx").on(t.verificationRecordId),
    index("verification_workflows_actor_id_idx").on(t.actorId),
  ],
);

export const businessScoresTable = pgTable(
  "business_scores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businessesTable.id),
    totalScore: numeric("total_score", { precision: 5, scale: 2 }).notNull().default("0"),
    verificationComponent: numeric("verification_component", { precision: 5, scale: 2 }).notNull().default("0"),
    feedbackComponent: numeric("feedback_component", { precision: 5, scale: 2 }).notNull().default("0"),
    recencyComponent: numeric("recency_component", { precision: 5, scale: 2 }).notNull().default("0"),
    completenessComponent: numeric("completeness_component", { precision: 5, scale: 2 }).notNull().default("0"),
    lastCalculatedAt: timestamp("last_calculated_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("business_scores_business_id_idx").on(t.businessId),
  ],
);

export const businessScoreHistoryTable = pgTable(
  "business_score_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businessesTable.id),
    totalScore: numeric("total_score", { precision: 5, scale: 2 }).notNull(),
    previousScore: numeric("previous_score", { precision: 5, scale: 2 }),
    triggerEvent: text("trigger_event"),
    changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("business_score_history_business_id_idx").on(t.businessId),
    index("business_score_history_changed_at_idx").on(t.changedAt),
  ],
);

export type VerificationType = typeof verificationTypesTable.$inferSelect;
export type InsertVerificationType = typeof verificationTypesTable.$inferInsert;

export type VerificationRecord = typeof verificationRecordsTable.$inferSelect;
export type InsertVerificationRecord = typeof verificationRecordsTable.$inferInsert;

export type VerificationWorkflow = typeof verificationWorkflowsTable.$inferSelect;
export type InsertVerificationWorkflow = typeof verificationWorkflowsTable.$inferInsert;

export type BusinessScore = typeof businessScoresTable.$inferSelect;
export type InsertBusinessScore = typeof businessScoresTable.$inferInsert;

export type BusinessScoreHistory = typeof businessScoreHistoryTable.$inferSelect;
export type InsertBusinessScoreHistory = typeof businessScoreHistoryTable.$inferInsert;
