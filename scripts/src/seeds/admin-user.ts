import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  usersTable,
  userAuthProvidersTable,
  marketplacesTable,
  marketplaceMembershipsTable,
  rolesTable,
  userRolesTable,
} from "@workspace/db";
import bcrypt from "bcryptjs";
import { withDb, log, logDone } from "./seed-utils";

const ADMIN_EMAIL = "admin@fashion-nigeria.com";
const ADMIN_PASSWORD = "Admin1234!";
const ADMIN_DISPLAY_NAME = "Fashion Nigeria Admin";
const MP_SLUG = "fashion-nigeria";
const ADMIN_ROLE_CODE = "marketplace_admin";

async function seed() {
  log("Seeding admin user…");

  const [marketplace] = await db
    .select({ id: marketplacesTable.id })
    .from(marketplacesTable)
    .where(eq(marketplacesTable.slug, MP_SLUG));

  if (!marketplace) throw new Error(`Marketplace '${MP_SLUG}' not found — run seed:fashion-nigeria first`);

  const [adminRole] = await db
    .select({ id: rolesTable.id })
    .from(rolesTable)
    .where(eq(rolesTable.code, ADMIN_ROLE_CODE));

  if (!adminRole) throw new Error(`Role '${ADMIN_ROLE_CODE}' not found — run seed:roles-permissions first`);

  // Upsert user
  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, ADMIN_EMAIL));

  let userId: string;

  if (existing) {
    userId = existing.id;
    log("Admin user already exists", { id: userId, email: ADMIN_EMAIL });
  } else {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

    const [user] = await db
      .insert(usersTable)
      .values({
        email: ADMIN_EMAIL,
        displayName: ADMIN_DISPLAY_NAME,
        status: "active",
        emailVerifiedAt: new Date(),
      })
      .returning({ id: usersTable.id });

    userId = user!.id;
    log("Admin user created", { id: userId, email: ADMIN_EMAIL });

    await db
      .insert(userAuthProvidersTable)
      .values({ userId, provider: "local", passwordHash })
      .onConflictDoNothing();

    log("Auth provider created");
  }

  // Ensure marketplace membership
  await db
    .insert(marketplaceMembershipsTable)
    .values({ userId, marketplaceId: marketplace.id })
    .onConflictDoNothing();

  log("Marketplace membership ensured", { marketplaceId: marketplace.id });

  // Ensure role assignment
  await db
    .insert(userRolesTable)
    .values({ userId, marketplaceId: marketplace.id, roleId: adminRole.id })
    .onConflictDoNothing();

  log("Role assigned", { role: ADMIN_ROLE_CODE });

  logDone("admin-user", existing ? 0 : 1);
  log("Login credentials: email=" + ADMIN_EMAIL + "  password=" + ADMIN_PASSWORD);
}

withDb(seed).catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
