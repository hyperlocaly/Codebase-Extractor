import {
  pgTable,
  text,
  boolean,
  uuid,
  integer,
  smallint,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { marketplacesTable } from "./marketplaces";
import { usersTable } from "./users";

export const mediaTable = pgTable(
  "media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    marketplaceId: uuid("marketplace_id")
      .notNull()
      .references(() => marketplacesTable.id),
    storageProvider: text("storage_provider").notNull().default("s3"),
    storageKey: text("storage_key").notNull(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    fileSizeBytes: integer("file_size_bytes"),
    width: integer("width"),
    height: integer("height"),
    durationSeconds: integer("duration_seconds"),
    purpose: text("purpose").notNull().default("gallery"),
    sortOrder: smallint("sort_order").notNull().default(0),
    isPrimary: boolean("is_primary").notNull().default(false),
    uploadedBy: uuid("uploaded_by").references(() => usersTable.id),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("media_entity_idx").on(t.entityType, t.entityId),
    index("media_marketplace_id_idx").on(t.marketplaceId),
    index("media_status_idx").on(t.status),
    index("media_purpose_idx").on(t.purpose),
    index("media_storage_key_idx").on(t.storageKey),
  ],
);

export type Media = typeof mediaTable.$inferSelect;
export type InsertMedia = typeof mediaTable.$inferInsert;
