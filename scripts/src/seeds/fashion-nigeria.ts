import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  organizationsTable,
  marketplacesTable,
  countriesTable,
  currenciesTable,
  categoriesTable,
  featuresTable,
  verificationTypesTable,
} from "@workspace/db";
import { withDb, log, logDone } from "./seed-utils";

const ORG_SLUG = "hbe-platform";
const MP_SLUG = "fashion-nigeria";

const FEATURES = [
  { name: "Home Measurement Available",              code: "home-measurement",        appliesToEntityType: "service" },
  { name: "Customer Brings Fabric",                  code: "customer-brings-fabric",  appliesToEntityType: "service" },
  { name: "Fabric Available",                        code: "fabric-available",         appliesToEntityType: "service" },
  { name: "Both (Fabric or Customer Brings)",        code: "fabric-flexible",          appliesToEntityType: "service" },
  { name: "Delivery Timeline: Same Day",             code: "delivery-same-day",        appliesToEntityType: "service" },
  { name: "Delivery Timeline: 3 Days",               code: "delivery-3-days",          appliesToEntityType: "service" },
  { name: "Delivery Timeline: 1 Week",               code: "delivery-1-week",          appliesToEntityType: "service" },
  { name: "Delivery Timeline: 2 Weeks+",             code: "delivery-2-weeks",         appliesToEntityType: "service" },
  { name: "Portfolio Showcase",                      code: "portfolio-showcase",       appliesToEntityType: "portfolio" },
  { name: "Handmade",                                code: "handmade",                 appliesToEntityType: "product" },
  { name: "Premium Quality",                         code: "premium-quality",          appliesToEntityType: "service" },
  { name: "Wholesale Available",                     code: "wholesale-available",      appliesToEntityType: "product" },
  { name: "Customizable",                            code: "customizable",             appliesToEntityType: "service" },
  { name: "Affordable",                              code: "affordable",               appliesToEntityType: "business" },
  { name: "Express Service",                         code: "express-service",          appliesToEntityType: "service" },
];

const VERIFICATION_TYPES = [
  { code: "phone",    name: "Phone Verification",    weight: "1.0", isEnabled: true,  sortOrder: 0 },
  { code: "whatsapp", name: "WhatsApp Verification", weight: "1.0", isEnabled: true,  sortOrder: 1 },
  { code: "location", name: "Location Verification", weight: "1.5", isEnabled: true,  sortOrder: 2 },
  { code: "business", name: "Business Verification", weight: "2.0", isEnabled: true,  sortOrder: 3 },
];

async function seed() {
  log("Seeding Fashion Nigeria marketplace…");

  const [nigeria] = await db
    .select()
    .from(countriesTable)
    .where(eq(countriesTable.isoCode, "NG"));

  if (!nigeria) throw new Error("Nigeria not found — run seed:countries first");

  const [ngn] = await db
    .select()
    .from(currenciesTable)
    .where(eq(currenciesTable.code, "NGN"));

  if (!ngn) throw new Error("NGN not found — run seed:currencies first");

  const [rootCategory] = await db
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.slug, "fashion-tailoring"));

  if (!rootCategory) throw new Error("fashion-tailoring category not found — run seed:categories-fashion first");

  const [existingOrg] = await db
    .select()
    .from(organizationsTable)
    .where(eq(organizationsTable.slug, ORG_SLUG));

  let orgId = existingOrg?.id;
  if (!orgId) {
    const [org] = await db
      .insert(organizationsTable)
      .values({
        name: "HBE Platform",
        slug: ORG_SLUG,
        description: "HyperLocal Business Engine platform organization",
        plan: "enterprise",
        isActive: true,
      })
      .returning({ id: organizationsTable.id });
    orgId = org!.id;
    log("Organization created", { id: orgId });
  } else {
    log("Organization already exists", { id: orgId });
  }

  const [existingMp] = await db
    .select()
    .from(marketplacesTable)
    .where(eq(marketplacesTable.slug, MP_SLUG));

  let marketplaceId = existingMp?.id;
  if (!marketplaceId) {
    const [mp] = await db
      .insert(marketplacesTable)
      .values({
        organizationId: orgId,
        name: "Fashion Nigeria",
        slug: MP_SLUG,
        tagline: "Find the best tailors and fashion designers near you",
        description: "Nigeria's premier hyperlocal fashion and tailoring discovery platform",
        countryId: nigeria.id,
        currencyId: ngn.id,
        rootCategoryId: rootCategory.id,
        status: "active",
        primaryColor: "#2D6A4F",
      })
      .returning({ id: marketplacesTable.id });
    marketplaceId = mp!.id;
    log("Marketplace created", { id: marketplaceId });
  } else {
    log("Marketplace already exists", { id: marketplaceId });
  }

  let featuresInserted = 0;
  for (const feature of FEATURES) {
    const result = await db
      .insert(featuresTable)
      .values({
        marketplaceId,
        name: feature.name,
        code: feature.code,
        appliesToEntityType: feature.appliesToEntityType,
        isActive: true,
      })
      .onConflictDoNothing({ target: [featuresTable.marketplaceId, featuresTable.code] })
      .returning({ id: featuresTable.id });
    if (result.length > 0) featuresInserted++;
  }
  log(`Features: ${featuresInserted} inserted`);

  let verificationTypesInserted = 0;
  for (const vt of VERIFICATION_TYPES) {
    const result = await db
      .insert(verificationTypesTable)
      .values({
        marketplaceId,
        code: vt.code,
        name: vt.name,
        weight: vt.weight,
        isEnabled: vt.isEnabled,
        sortOrder: vt.sortOrder,
        appliesToEntityType: "business",
      })
      .onConflictDoNothing({ target: [verificationTypesTable.marketplaceId, verificationTypesTable.code] })
      .returning({ id: verificationTypesTable.id });
    if (result.length > 0) verificationTypesInserted++;
  }
  log(`Verification types: ${verificationTypesInserted} inserted`);

  logDone("fashion-nigeria", 1);
  log(`Marketplace ID: ${marketplaceId}`);
}

withDb(seed).catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
