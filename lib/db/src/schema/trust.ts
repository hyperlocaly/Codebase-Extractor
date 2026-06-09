import {
  pgTable,
  text,
  boolean,
  uuid,
  smallint,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { marketplacesTable } from "./marketplaces";
import { businessesTable } from "./businesses";
import { usersTable } from "./users";

export const reviewsTable = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    marketplaceId: uuid("marketplace_id")
      .notNull()
      .references(() => marketplacesTable.id),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businessesTable.id),
    reviewerId: uuid("reviewer_id")
      .notNull()
      .references(() => usersTable.id),
    rating: smallint("rating").notNull(),
    title: text("title"),
    body: text("body"),
    status: text("status").notNull().default("pending"),
    moderationStatus: text("moderation_status").notNull().default("auto_approved"),
    moderationNote: text("moderation_note"),
    isAnonymous: boolean("is_anonymous").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("reviews_reviewer_business_idx")
      .on(t.reviewerId, t.businessId)
      .where(sql`deleted_at IS NULL`),
    index("reviews_business_id_idx").on(t.businessId),
    index("reviews_marketplace_id_idx").on(t.marketplaceId),
    index("reviews_status_idx").on(t.status),
    index("reviews_moderation_status_idx").on(t.moderationStatus),
  ],
);

export const reviewResponsesTable = pgTable(
  "review_responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => reviewsTable.id),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businessesTable.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id),
    response: text("response").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("review_responses_review_business_idx").on(t.reviewId, t.businessId),
    index("review_responses_review_id_idx").on(t.reviewId),
    index("review_responses_business_id_idx").on(t.businessId),
  ],
);

export const reviewReportsTable = pgTable(
  "review_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => reviewsTable.id),
    reporterId: uuid("reporter_id")
      .notNull()
      .references(() => usersTable.id),
    reason: text("reason").notNull(),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("review_reports_reviewer_report_idx").on(t.reviewId, t.reporterId),
    index("review_reports_review_id_idx").on(t.reviewId),
    index("review_reports_status_idx").on(t.status),
  ],
);

export const feedbackTable = pgTable(
  "feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    marketplaceId: uuid("marketplace_id")
      .notNull()
      .references(() => marketplacesTable.id),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businessesTable.id),
    sessionId: text("session_id"),
    didRespond: text("did_respond"),
    wasAccurate: boolean("was_accurate"),
    comment: text("comment"),
    ipAddress: text("ip_address"),
    source: text("source").notNull().default("web"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("feedback_business_id_idx").on(t.businessId),
    index("feedback_marketplace_id_idx").on(t.marketplaceId),
    index("feedback_ip_business_idx").on(t.ipAddress, t.businessId),
    index("feedback_created_at_idx").on(t.createdAt),
  ],
);

export type Review = typeof reviewsTable.$inferSelect;
export type InsertReview = typeof reviewsTable.$inferInsert;

export type ReviewResponse = typeof reviewResponsesTable.$inferSelect;
export type InsertReviewResponse = typeof reviewResponsesTable.$inferInsert;

export type ReviewReport = typeof reviewReportsTable.$inferSelect;
export type InsertReviewReport = typeof reviewReportsTable.$inferInsert;

export type Feedback = typeof feedbackTable.$inferSelect;
export type InsertFeedback = typeof feedbackTable.$inferInsert;
