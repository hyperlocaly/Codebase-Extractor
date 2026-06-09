import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { categoriesTable } from "@workspace/db";
import { withDb, log, logDone } from "./seed-utils";

interface CategoryInput {
  name: string;
  slug: string;
  description?: string;
  depth: number;
  parentSlug?: string;
  sortOrder?: number;
}

const FASHION_CATEGORIES: CategoryInput[] = [
  { name: "Fashion & Tailoring", slug: "fashion-tailoring", description: "Fashion design, tailoring, and textile services", depth: 0, sortOrder: 0 },

  { name: "Tailor",              slug: "tailor",              description: "Custom tailoring and clothing alterations", depth: 1, parentSlug: "fashion-tailoring", sortOrder: 0 },
  { name: "Fashion Designer",   slug: "fashion-designer",   description: "Original fashion design and creation",      depth: 1, parentSlug: "fashion-tailoring", sortOrder: 1 },
  { name: "Fabric Seller",      slug: "fabric-seller",      description: "Retail and wholesale fabric supply",        depth: 1, parentSlug: "fashion-tailoring", sortOrder: 2 },
  { name: "Embroidery Service", slug: "embroidery-service", description: "Machine and hand embroidery",               depth: 1, parentSlug: "fashion-tailoring", sortOrder: 3 },
  { name: "Pattern Maker",      slug: "pattern-maker",      description: "Garment pattern creation and drafting",     depth: 1, parentSlug: "fashion-tailoring", sortOrder: 4 },
  { name: "Accessory Supplier", slug: "accessory-supplier", description: "Garment accessories and trims supply",      depth: 1, parentSlug: "fashion-tailoring", sortOrder: 5 },
  { name: "Fashion Trainer",    slug: "fashion-trainer",    description: "Fashion and tailoring instruction",          depth: 1, parentSlug: "fashion-tailoring", sortOrder: 6 },

  { name: "Agbada Specialist",          slug: "agbada-specialist",          depth: 2, parentSlug: "tailor",              sortOrder: 0 },
  { name: "Senator Specialist",         slug: "senator-specialist",         depth: 2, parentSlug: "tailor",              sortOrder: 1 },
  { name: "Wedding Wear Specialist",    slug: "wedding-wear-specialist",    depth: 2, parentSlug: "tailor",              sortOrder: 2 },
  { name: "Children's Wear Specialist", slug: "childrens-wear-specialist",  depth: 2, parentSlug: "tailor",              sortOrder: 3 },
  { name: "General Tailor",             slug: "general-tailor",             depth: 2, parentSlug: "tailor",              sortOrder: 4 },

  { name: "Ready-to-Wear Designer", slug: "ready-to-wear-designer", depth: 2, parentSlug: "fashion-designer", sortOrder: 0 },
  { name: "Couture Designer",       slug: "couture-designer",       depth: 2, parentSlug: "fashion-designer", sortOrder: 1 },
  { name: "Bridal Designer",        slug: "bridal-designer",        depth: 2, parentSlug: "fashion-designer", sortOrder: 2 },

  { name: "Ankara Seller",        slug: "ankara-seller",        depth: 2, parentSlug: "fabric-seller", sortOrder: 0 },
  { name: "Lace Seller",          slug: "lace-seller",          depth: 2, parentSlug: "fabric-seller", sortOrder: 1 },
  { name: "Aso Oke Seller",       slug: "aso-oke-seller",       depth: 2, parentSlug: "fabric-seller", sortOrder: 2 },
  { name: "General Fabric Seller",slug: "general-fabric-seller",depth: 2, parentSlug: "fabric-seller", sortOrder: 3 },

  { name: "Machine Embroidery", slug: "machine-embroidery", depth: 2, parentSlug: "embroidery-service", sortOrder: 0 },
  { name: "Hand Embroidery",    slug: "hand-embroidery",    depth: 2, parentSlug: "embroidery-service", sortOrder: 1 },

  { name: "Button & Zipper Supplier", slug: "button-zipper-supplier", depth: 2, parentSlug: "accessory-supplier", sortOrder: 0 },
  { name: "Lining Supplier",          slug: "lining-supplier",         depth: 2, parentSlug: "accessory-supplier", sortOrder: 1 },
  { name: "Trim Supplier",            slug: "trim-supplier",            depth: 2, parentSlug: "accessory-supplier", sortOrder: 2 },

  { name: "Tailoring Instructor",       slug: "tailoring-instructor",       depth: 2, parentSlug: "fashion-trainer", sortOrder: 0 },
  { name: "Fashion Design Instructor",  slug: "fashion-design-instructor",  depth: 2, parentSlug: "fashion-trainer", sortOrder: 1 },
];

async function seed() {
  log("Seeding fashion categories…");
  let inserted = 0;
  let skipped = 0;

  const slugToId = new Map<string, string>();

  const existing = await db.select({ id: categoriesTable.id, slug: categoriesTable.slug }).from(categoriesTable);
  for (const row of existing) {
    slugToId.set(row.slug, row.id);
  }

  for (const cat of FASHION_CATEGORIES) {
    const parentId = cat.parentSlug ? (slugToId.get(cat.parentSlug) ?? null) : null;

    if (slugToId.has(cat.slug)) {
      skipped++;
      continue;
    }

    const [row] = await db
      .insert(categoriesTable)
      .values({
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        depth: cat.depth,
        parentId: parentId ?? undefined,
        sortOrder: cat.sortOrder ?? 0,
        isActive: true,
      })
      .returning({ id: categoriesTable.id });

    if (row) {
      slugToId.set(cat.slug, row.id);
      inserted++;
    }
  }

  logDone("categories-fashion", inserted, skipped);
}

withDb(seed).catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
