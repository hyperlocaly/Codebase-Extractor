import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { rolesTable, permissionsTable, rolePermissionsTable } from "@workspace/db";
import { ROLE_CODES } from "@workspace/domain-constants";
import { withDb, log, logDone } from "./seed-utils";

const ROLES = [
  { code: "superadmin",            name: "Super Admin",             isSystem: true,  isMarketplaceScoped: false, description: "Full platform access" },
  { code: "platform_ops",          name: "Platform Operations",     isSystem: true,  isMarketplaceScoped: false, description: "Platform-level operations" },
  { code: "marketplace_admin",     name: "Marketplace Admin",       isSystem: true,  isMarketplaceScoped: true,  description: "Full marketplace management" },
  { code: "marketplace_moderator", name: "Marketplace Moderator",   isSystem: true,  isMarketplaceScoped: true,  description: "Content moderation" },
  { code: "marketplace_analyst",   name: "Marketplace Analyst",     isSystem: true,  isMarketplaceScoped: true,  description: "Analytics read access" },
  { code: "business_owner",        name: "Business Owner",          isSystem: true,  isMarketplaceScoped: true,  description: "Full business management" },
  { code: "business_manager",      name: "Business Manager",        isSystem: true,  isMarketplaceScoped: true,  description: "Business content management" },
  { code: "business_staff",        name: "Business Staff",          isSystem: true,  isMarketplaceScoped: true,  description: "Limited business access" },
  { code: "consumer",              name: "Consumer",                isSystem: true,  isMarketplaceScoped: true,  description: "Standard marketplace user" },
] satisfies { code: typeof ROLE_CODES[number]; name: string; isSystem: boolean; isMarketplaceScoped: boolean; description: string }[];

const PERMISSIONS = [
  { code: "business:create",          module: "business",      action: "create",          name: "Create Business" },
  { code: "business:read",            module: "business",      action: "read",            name: "Read Business" },
  { code: "business:update",          module: "business",      action: "update",          name: "Update Business" },
  { code: "business:delete",          module: "business",      action: "delete",          name: "Delete Business" },
  { code: "business:publish",         module: "business",      action: "publish",         name: "Publish Business" },
  { code: "business:claim",           module: "business",      action: "claim",           name: "Claim Business" },
  { code: "product:create",           module: "product",       action: "create",          name: "Create Product" },
  { code: "product:update",           module: "product",       action: "update",          name: "Update Product" },
  { code: "product:delete",           module: "product",       action: "delete",          name: "Delete Product" },
  { code: "service:create",           module: "service",       action: "create",          name: "Create Service" },
  { code: "service:update",           module: "service",       action: "update",          name: "Update Service" },
  { code: "service:delete",           module: "service",       action: "delete",          name: "Delete Service" },
  { code: "portfolio:create",         module: "portfolio",     action: "create",          name: "Create Portfolio" },
  { code: "portfolio:update",         module: "portfolio",     action: "update",          name: "Update Portfolio" },
  { code: "portfolio:publish",        module: "portfolio",     action: "publish",         name: "Publish Portfolio" },
  { code: "update:create",            module: "update",        action: "create",          name: "Create Business Update" },
  { code: "update:publish",           module: "update",        action: "publish",         name: "Publish Business Update" },
  { code: "media:upload",             module: "media",         action: "upload",          name: "Upload Media" },
  { code: "media:delete",             module: "media",         action: "delete",          name: "Delete Media" },
  { code: "review:create",            module: "review",        action: "create",          name: "Create Review" },
  { code: "review:moderate",          module: "review",        action: "moderate",        name: "Moderate Review" },
  { code: "feedback:create",          module: "feedback",      action: "create",          name: "Submit Feedback" },
  { code: "verification:manage",      module: "verification",  action: "manage",          name: "Manage Verifications" },
  { code: "claim:review",             module: "claim",         action: "review",          name: "Review Claims" },
  { code: "analytics:read:business",  module: "analytics",     action: "read:business",   name: "Read Business Analytics" },
  { code: "analytics:read:marketplace", module: "analytics",   action: "read:marketplace", name: "Read Marketplace Analytics" },
  { code: "user:manage",              module: "user",          action: "manage",          name: "Manage Users" },
  { code: "marketplace:configure",    module: "marketplace",   action: "configure",       name: "Configure Marketplace" },
  { code: "saved_item:manage",        module: "saved_item",    action: "manage",          name: "Manage Saved Items" },
];

const ROLE_PERMISSION_MAP: Record<string, string[]> = {
  superadmin:            PERMISSIONS.map((p) => p.code),
  platform_ops:          PERMISSIONS.map((p) => p.code),
  marketplace_admin: [
    "business:create", "business:read", "business:update", "business:delete",
    "business:publish", "product:create", "product:update", "product:delete",
    "service:create", "service:update", "service:delete",
    "portfolio:create", "portfolio:update", "portfolio:publish",
    "update:create", "update:publish",
    "media:upload", "media:delete",
    "review:create", "review:moderate",
    "feedback:create", "verification:manage", "claim:review",
    "analytics:read:business", "analytics:read:marketplace",
    "marketplace:configure",
  ],
  marketplace_moderator: [
    "business:read", "review:moderate", "claim:review", "verification:manage",
  ],
  marketplace_analyst:   ["analytics:read:business", "analytics:read:marketplace", "business:read"],
  business_owner: [
    "business:update", "business:publish",
    "product:create", "product:update", "product:delete",
    "service:create", "service:update", "service:delete",
    "portfolio:create", "portfolio:update", "portfolio:publish",
    "update:create", "update:publish",
    "media:upload", "media:delete",
    "analytics:read:business",
  ],
  business_manager: [
    "business:update",
    "product:create", "product:update",
    "service:create", "service:update",
    "portfolio:create", "portfolio:update", "portfolio:publish",
    "update:create", "update:publish",
    "media:upload",
    "analytics:read:business",
  ],
  business_staff:  ["business:update", "media:upload", "update:create"],
  consumer:        ["business:read", "review:create", "feedback:create", "saved_item:manage"],
};

async function seed() {
  log("Seeding roles and permissions…");

  let rolesInserted = 0;
  let permsInserted = 0;
  let mappingsInserted = 0;

  for (const role of ROLES) {
    const result = await db
      .insert(rolesTable)
      .values(role)
      .onConflictDoNothing({ target: rolesTable.code })
      .returning({ id: rolesTable.id });
    if (result.length > 0) rolesInserted++;
  }
  log(`Roles: ${rolesInserted} inserted`);

  for (const perm of PERMISSIONS) {
    const result = await db
      .insert(permissionsTable)
      .values(perm)
      .onConflictDoNothing({ target: permissionsTable.code })
      .returning({ id: permissionsTable.id });
    if (result.length > 0) permsInserted++;
  }
  log(`Permissions: ${permsInserted} inserted`);

  const allRoles = await db.select().from(rolesTable);
  const allPerms = await db.select().from(permissionsTable);
  const roleMap = new Map(allRoles.map((r) => [r.code, r.id]));
  const permMap = new Map(allPerms.map((p) => [p.code, p.id]));

  for (const [roleCode, permCodes] of Object.entries(ROLE_PERMISSION_MAP)) {
    const roleId = roleMap.get(roleCode);
    if (!roleId) continue;

    for (const permCode of permCodes) {
      const permId = permMap.get(permCode);
      if (!permId) continue;

      const result = await db
        .insert(rolePermissionsTable)
        .values({ roleId, permissionId: permId })
        .onConflictDoNothing({ target: [rolePermissionsTable.roleId, rolePermissionsTable.permissionId] })
        .returning({ id: rolePermissionsTable.id });
      if (result.length > 0) mappingsInserted++;
    }
  }

  logDone("roles-permissions", rolesInserted + permsInserted + mappingsInserted);
  log(`  ${rolesInserted} roles, ${permsInserted} permissions, ${mappingsInserted} role-permission mappings`);
}

withDb(seed).catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
