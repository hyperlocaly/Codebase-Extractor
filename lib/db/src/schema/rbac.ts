import {
  pgTable,
  text,
  boolean,
  uuid,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { marketplacesTable } from "./marketplaces";

export const rolesTable = pgTable(
  "roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    isSystem: boolean("is_system").notNull().default(false),
    isMarketplaceScoped: boolean("is_marketplace_scoped").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("roles_code_idx").on(t.code)],
);

export const permissionsTable = pgTable(
  "permissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    module: text("module").notNull(),
    action: text("action").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("permissions_code_idx").on(t.code),
    index("permissions_module_idx").on(t.module),
  ],
);

export const rolePermissionsTable = pgTable(
  "role_permissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roleId: uuid("role_id")
      .notNull()
      .references(() => rolesTable.id),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissionsTable.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("role_permissions_role_perm_idx").on(t.roleId, t.permissionId),
    index("role_permissions_role_id_idx").on(t.roleId),
  ],
);

export const userRolesTable = pgTable(
  "user_roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id),
    marketplaceId: uuid("marketplace_id").references(() => marketplacesTable.id),
    roleId: uuid("role_id")
      .notNull()
      .references(() => rolesTable.id),
    businessId: uuid("business_id"),
    grantedBy: uuid("granted_by").references(() => usersTable.id),
    grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
  },
  (t) => [
    index("user_roles_user_id_idx").on(t.userId),
    index("user_roles_marketplace_id_idx").on(t.marketplaceId),
    index("user_roles_business_id_idx").on(t.businessId),
    index("user_roles_user_mp_role_idx").on(t.userId, t.marketplaceId, t.roleId),
    index("user_roles_is_active_idx").on(t.isActive),
  ],
);

export type Role = typeof rolesTable.$inferSelect;
export type InsertRole = typeof rolesTable.$inferInsert;

export type Permission = typeof permissionsTable.$inferSelect;
export type InsertPermission = typeof permissionsTable.$inferInsert;

export type RolePermission = typeof rolePermissionsTable.$inferSelect;
export type InsertRolePermission = typeof rolePermissionsTable.$inferInsert;

export type UserRole = typeof userRolesTable.$inferSelect;
export type InsertUserRole = typeof userRolesTable.$inferInsert;
