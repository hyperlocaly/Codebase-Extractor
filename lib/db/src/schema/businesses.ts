import {
  pgTable,
  text,
  boolean,
  uuid,
  numeric,
  smallint,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { marketplacesTable } from "./marketplaces";
import { locationsTable } from "./locations";
import { categoriesTable } from "./categories";
import { usersTable } from "./users";

export const businessesTable = pgTable(
  "businesses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    marketplaceId: uuid("marketplace_id")
      .notNull()
      .references(() => marketplacesTable.id),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    tagline: text("tagline"),
    description: text("description"),
    locationId: uuid("location_id").references(() => locationsTable.id),
    addressLine1: text("address_line1"),
    addressLine2: text("address_line2"),
    latitude: numeric("latitude", { precision: 10, scale: 7 }),
    longitude: numeric("longitude", { precision: 10, scale: 7 }),
    status: text("status").notNull().default("draft"),
    claimStatus: text("claim_status").notNull().default("unclaimed"),
    verificationScore: numeric("verification_score", { precision: 5, scale: 2 }).notNull().default("0"),
    whatsappNumber: text("whatsapp_number"),
    primaryPhone: text("primary_phone"),
    primaryEmail: text("primary_email"),
    websiteUrl: text("website_url"),
    createdBy: uuid("created_by").references(() => usersTable.id),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("businesses_mp_slug_active_idx")
      .on(t.marketplaceId, t.slug)
      .where(sql`deleted_at IS NULL`),
    index("businesses_marketplace_id_idx").on(t.marketplaceId),
    index("businesses_location_id_idx").on(t.locationId),
    index("businesses_status_idx").on(t.status),
    index("businesses_claim_status_idx").on(t.claimStatus),
    index("businesses_created_by_idx").on(t.createdBy),
  ],
);

export const businessTypeAssignmentsTable = pgTable(
  "business_type_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businessesTable.id),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categoriesTable.id),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("business_type_assignments_biz_cat_idx").on(t.businessId, t.categoryId),
    index("business_type_assignments_business_id_idx").on(t.businessId),
  ],
);

export const businessContactsTable = pgTable(
  "business_contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businessesTable.id),
    contactType: text("contact_type").notNull(),
    value: text("value").notNull(),
    isPrimary: boolean("is_primary").notNull().default(false),
    isVerified: boolean("is_verified").notNull().default(false),
    displayOrder: smallint("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("business_contacts_business_id_idx").on(t.businessId),
    index("business_contacts_type_idx").on(t.contactType),
  ],
);

export const businessServiceAreasTable = pgTable(
  "business_service_areas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businessesTable.id),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locationsTable.id),
    radiusKm: numeric("radius_km", { precision: 6, scale: 2 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("business_service_areas_biz_loc_idx").on(t.businessId, t.locationId),
    index("business_service_areas_business_id_idx").on(t.businessId),
  ],
);

export const businessBranchesTable = pgTable(
  "business_branches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businessesTable.id),
    name: text("name").notNull(),
    locationId: uuid("location_id").references(() => locationsTable.id),
    addressLine1: text("address_line1"),
    latitude: numeric("latitude", { precision: 10, scale: 7 }),
    longitude: numeric("longitude", { precision: 10, scale: 7 }),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("business_branches_business_id_idx").on(t.businessId)],
);

export const businessOwnersTable = pgTable(
  "business_owners",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businessesTable.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id),
    role: text("role").notNull().default("owner"),
    grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("business_owners_biz_user_idx").on(t.businessId, t.userId),
    index("business_owners_business_id_idx").on(t.businessId),
    index("business_owners_user_id_idx").on(t.userId),
    index("business_owners_is_active_idx").on(t.isActive),
  ],
);

export const claimRequestsTable = pgTable(
  "claim_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businessesTable.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id),
    status: text("status").notNull().default("pending"),
    evidenceUrl: text("evidence_url"),
    adminNote: text("admin_note"),
    reviewedBy: uuid("reviewed_by").references(() => usersTable.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("claim_requests_business_id_idx").on(t.businessId),
    index("claim_requests_user_id_idx").on(t.userId),
    index("claim_requests_status_idx").on(t.status),
  ],
);

export const businessHoursTable = pgTable(
  "business_hours",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businessesTable.id),
    dayOfWeek: smallint("day_of_week").notNull(),
    opensAt: text("opens_at"),
    closesAt: text("closes_at"),
    isClosed: boolean("is_closed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("business_hours_biz_day_idx").on(t.businessId, t.dayOfWeek),
    index("business_hours_business_id_idx").on(t.businessId),
  ],
);

export type Business = typeof businessesTable.$inferSelect;
export type InsertBusiness = typeof businessesTable.$inferInsert;

export type BusinessTypeAssignment = typeof businessTypeAssignmentsTable.$inferSelect;
export type InsertBusinessTypeAssignment = typeof businessTypeAssignmentsTable.$inferInsert;

export type BusinessContact = typeof businessContactsTable.$inferSelect;
export type InsertBusinessContact = typeof businessContactsTable.$inferInsert;

export type BusinessServiceArea = typeof businessServiceAreasTable.$inferSelect;
export type InsertBusinessServiceArea = typeof businessServiceAreasTable.$inferInsert;

export type BusinessBranch = typeof businessBranchesTable.$inferSelect;
export type InsertBusinessBranch = typeof businessBranchesTable.$inferInsert;

export type BusinessOwner = typeof businessOwnersTable.$inferSelect;
export type InsertBusinessOwner = typeof businessOwnersTable.$inferInsert;

export type ClaimRequest = typeof claimRequestsTable.$inferSelect;
export type InsertClaimRequest = typeof claimRequestsTable.$inferInsert;

export type BusinessHour = typeof businessHoursTable.$inferSelect;
export type InsertBusinessHour = typeof businessHoursTable.$inferInsert;
