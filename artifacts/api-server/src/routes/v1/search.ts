import { Router, type IRouter } from "express";
import { eq, and, isNull, ilike, desc, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  businessesTable,
  businessTypeAssignmentsTable,
  categoriesTable,
  productsTable,
  servicesTable,
  businessUpdatesTable,
  searchLogsTable,
} from "@workspace/db";
import { requireMarketplace } from "../../middleware/marketplace-context";
import { sendSuccess, sendPaginated } from "../../shared/response";
import { parsePagination } from "../../shared/pagination";
import { ValidationError } from "../../shared/errors";

const router: IRouter = Router();

async function logSearch(
  marketplaceId: string,
  query: string | undefined,
  filters: Record<string, unknown>,
  resultCount: number,
  userId: string | undefined,
  latencyMs: number,
  ipAddress?: string,
): Promise<void> {
  try {
    await db.insert(searchLogsTable).values({
      marketplaceId,
      query: query ?? null,
      filters,
      resultCount,
      userId: userId ?? null,
      ipAddress: ipAddress ?? null,
      latencyMs,
    });
  } catch { /* fire-and-forget */ }
}

/**
 * GET /api/v1/search/businesses
 */
router.get("/businesses", requireMarketplace, async (req, res, next): Promise<void> => {
  const t0 = Date.now();
  try {
    const marketplace = req.marketplace!;
    const {
      q,
      categorySlug,
      locationSlug,
      limit: rawLimit,
      cursor: rawCursor,
    } = req.query as Record<string, string | undefined>;

    const { limit } = parsePagination(rawLimit, rawCursor);

    const params: unknown[] = [marketplace.id];
    let paramIdx = 2;

    const conditions: string[] = [
      "b.marketplace_id = $1",
      "b.deleted_at IS NULL",
      "b.status = 'active'",
    ];

    if (locationSlug) {
      const { rows: locRows } = await (db as any).$client.query(
        `WITH RECURSIVE loc_tree AS (
           SELECT id FROM locations WHERE slug = $1 AND is_active = true
           UNION ALL
           SELECT l.id FROM locations l INNER JOIN loc_tree lt ON l.parent_id = lt.id
         ) SELECT id FROM loc_tree`,
        [locationSlug],
      );
      const locationIds = locRows.map((r: { id: string }) => r.id);
      if (locationIds.length > 0) {
        conditions.push(`b.location_id = ANY($${paramIdx}::uuid[])`);
        params.push(locationIds);
        paramIdx++;
      }
    }

    if (categorySlug) {
      const [cat] = await db
        .select({ id: categoriesTable.id })
        .from(categoriesTable)
        .where(eq(categoriesTable.slug, categorySlug));
      if (cat) {
        conditions.push(
          `EXISTS (SELECT 1 FROM business_type_assignments bta WHERE bta.business_id = b.id AND bta.category_id = $${paramIdx})`,
        );
        params.push(cat.id);
        paramIdx++;
      }
    }

    let orderByClause = "b.published_at DESC NULLS LAST, b.created_at DESC";
    if (q && q.trim().length > 0) {
      const term = q.trim();
      conditions.push(
        `(b.name ILIKE '%' || $${paramIdx} || '%' OR similarity(b.name, $${paramIdx}) > 0.15 OR b.tagline ILIKE '%' || $${paramIdx} || '%')`,
      );
      params.push(term);
      paramIdx++;
      orderByClause = `similarity(b.name, $${paramIdx - 1}) DESC, ${orderByClause}`;
    }

    if (rawCursor) {
      try {
        const { createdAt, id } = JSON.parse(Buffer.from(rawCursor, "base64url").toString());
        conditions.push(`(b.created_at < $${paramIdx} OR (b.created_at = $${paramIdx + 1} AND b.id < $${paramIdx + 2}))`);
        params.push(createdAt, createdAt, id);
        paramIdx += 3;
      } catch { /* ignore bad cursor */ }
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;
    const query = `
      SELECT
        b.id, b.name, b.slug, b.tagline, b.status, b.claim_status,
        b.verification_score, b.whatsapp_number, b.primary_phone,
        b.address_line1, b.location_id, b.latitude, b.longitude,
        b.published_at, b.created_at,
        l.name AS location_name, l.full_name AS location_full_name
      FROM businesses b
      LEFT JOIN locations l ON l.id = b.location_id
      ${whereClause}
      ORDER BY ${orderByClause}
      LIMIT ${limit + 1}
    `;

    const { rows } = await (db as any).$client.query(query, params);
    const hasMore = rows.length > limit;
    const resultRows = rows.slice(0, limit);

    let nextCursor: string | null = null;
    if (hasMore && resultRows.length > 0) {
      const last = resultRows[resultRows.length - 1];
      nextCursor = Buffer.from(JSON.stringify({ createdAt: last.created_at, id: last.id })).toString("base64url");
    }

    const mapped = resultRows.map((r: any) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      tagline: r.tagline,
      status: r.status,
      claimStatus: r.claim_status,
      verificationScore: r.verification_score,
      whatsappNumber: r.whatsapp_number,
      primaryPhone: r.primary_phone,
      addressLine1: r.address_line1,
      location: r.location_id ? { id: r.location_id, name: r.location_name, fullName: r.location_full_name } : null,
      publishedAt: r.published_at,
      createdAt: r.created_at,
    }));

    void logSearch(
      marketplace.id,
      q,
      { categorySlug, locationSlug },
      mapped.length,
      (req as any).user?.id,
      Date.now() - t0,
      req.ip,
    );

    sendPaginated(res, mapped, nextCursor);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/search/suggestions?q=&marketplace=
 */
router.get("/suggestions", requireMarketplace, async (req, res, next): Promise<void> => {
  try {
    const marketplace = req.marketplace!;
    const { q } = req.query as { q?: string };

    if (!q || q.trim().length < 2) {
      return next(new ValidationError("Query must be at least 2 characters"));
    }

    const term = q.trim();

    const [bizRows, catRows, locRows] = await Promise.all([
      (db as any).$client.query(
        `SELECT id, name, slug, 'business' AS type
         FROM businesses
         WHERE marketplace_id = $1
           AND deleted_at IS NULL
           AND status = 'active'
           AND name ILIKE '%' || $2 || '%'
         ORDER BY similarity(name, $2) DESC
         LIMIT 5`,
        [marketplace.id, term],
      ),
      db
        .select({ id: categoriesTable.id, name: categoriesTable.name, slug: categoriesTable.slug })
        .from(categoriesTable)
        .where(and(eq(categoriesTable.isActive, true), ilike(categoriesTable.name, `%${term}%`)))
        .limit(5),
      (db as any).$client.query(
        `SELECT id, name, full_name, 'location' AS type
         FROM locations
         WHERE is_active = true
           AND (name ILIKE '%' || $1 || '%' OR full_name ILIKE '%' || $1 || '%')
         ORDER BY similarity(name, $1) DESC
         LIMIT 5`,
        [term],
      ),
    ]);

    sendSuccess(res, {
      businesses: bizRows.rows.map((r: any) => ({ id: r.id, name: r.name, slug: r.slug, type: "business" })),
      categories: catRows.map((r) => ({ id: r.id, name: r.name, slug: r.slug, type: "category" })),
      locations: (locRows.rows as Array<{ id: string; name: string; full_name: string }>).map((r) => ({ id: r.id, name: r.name, fullName: r.full_name, type: "location" })),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/search/products?q=&businessId=&marketplace=
 */
router.get("/products", requireMarketplace, async (req, res, next): Promise<void> => {
  const t0 = Date.now();
  try {
    const marketplace = req.marketplace!;
    const { q, businessId, limit: rawLimit } = req.query as Record<string, string | undefined>;
    const { limit } = parsePagination(rawLimit, undefined);

    const conditions: any[] = [
      isNull(productsTable.deletedAt),
      eq(productsTable.status, "active"),
    ];

    if (businessId) {
      conditions.push(eq(productsTable.businessId, businessId));
    }

    const rows = await db
      .select({
        id: productsTable.id,
        name: productsTable.name,
        slug: productsTable.slug,
        description: productsTable.description,
        price: productsTable.price,
        stockStatus: productsTable.stockStatus,
        businessId: productsTable.businessId,
        createdAt: productsTable.createdAt,
        businessName: businessesTable.name,
        businessSlug: businessesTable.slug,
      })
      .from(productsTable)
      .innerJoin(businessesTable, and(
        eq(productsTable.businessId, businessesTable.id),
        eq(businessesTable.marketplaceId, marketplace.id),
        isNull(businessesTable.deletedAt),
        eq(businessesTable.status, "active"),
      ))
      .where(
        and(
          ...conditions,
          q ? ilike(productsTable.name, `%${q}%`) : undefined,
        ),
      )
      .orderBy(desc(productsTable.createdAt))
      .limit(limit + 1);

    const resultRows = rows.slice(0, limit);
    void logSearch(marketplace.id, q, { entityType: "product", businessId }, resultRows.length, (req as any).user?.id, Date.now() - t0, req.ip);
    sendPaginated(res, resultRows, null);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/search/services?q=&businessId=&marketplace=
 */
router.get("/services", requireMarketplace, async (req, res, next): Promise<void> => {
  const t0 = Date.now();
  try {
    const marketplace = req.marketplace!;
    const { q, businessId, limit: rawLimit } = req.query as Record<string, string | undefined>;
    const { limit } = parsePagination(rawLimit, undefined);

    const conditions: any[] = [
      isNull(servicesTable.deletedAt),
      eq(servicesTable.status, "active"),
    ];

    if (businessId) {
      conditions.push(eq(servicesTable.businessId, businessId));
    }

    const rows = await db
      .select({
        id: servicesTable.id,
        name: servicesTable.name,
        slug: servicesTable.slug,
        description: servicesTable.description,
        priceFrom: servicesTable.priceFrom,
        priceTo: servicesTable.priceTo,
        businessId: servicesTable.businessId,
        createdAt: servicesTable.createdAt,
        businessName: businessesTable.name,
        businessSlug: businessesTable.slug,
      })
      .from(servicesTable)
      .innerJoin(businessesTable, and(
        eq(servicesTable.businessId, businessesTable.id),
        eq(businessesTable.marketplaceId, marketplace.id),
        isNull(businessesTable.deletedAt),
        eq(businessesTable.status, "active"),
      ))
      .where(
        and(
          ...conditions,
          q ? ilike(servicesTable.name, `%${q}%`) : undefined,
        ),
      )
      .orderBy(desc(servicesTable.createdAt))
      .limit(limit + 1);

    const resultRows = rows.slice(0, limit);
    void logSearch(marketplace.id, q, { entityType: "service", businessId }, resultRows.length, (req as any).user?.id, Date.now() - t0, req.ip);
    sendPaginated(res, resultRows, null);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/search/updates?q=&businessId=&type=&marketplace=
 * Search published business updates (news, offers, events, announcements).
 */
router.get("/updates", requireMarketplace, async (req, res, next): Promise<void> => {
  const t0 = Date.now();
  try {
    const marketplace = req.marketplace!;
    const { q, businessId, type: updateType, limit: rawLimit, cursor: rawCursor } = req.query as Record<string, string | undefined>;
    const { limit } = parsePagination(rawLimit, rawCursor);

    const conditions: any[] = [
      eq(businessUpdatesTable.status, "published"),
      eq(businessesTable.marketplaceId, marketplace.id),
      isNull(businessesTable.deletedAt),
      eq(businessesTable.status, "active"),
    ];

    if (businessId) conditions.push(eq(businessUpdatesTable.businessId, businessId));
    if (updateType) conditions.push(eq(businessUpdatesTable.updateType, updateType));
    if (q) conditions.push(ilike(businessUpdatesTable.title, `%${q}%`));

    const rows = await db
      .select({
        id: businessUpdatesTable.id,
        title: businessUpdatesTable.title,
        body: businessUpdatesTable.body,
        updateType: businessUpdatesTable.updateType,
        publishedAt: businessUpdatesTable.publishedAt,
        expiresAt: businessUpdatesTable.expiresAt,
        businessId: businessUpdatesTable.businessId,
        businessName: businessesTable.name,
        businessSlug: businessesTable.slug,
        createdAt: businessUpdatesTable.createdAt,
      })
      .from(businessUpdatesTable)
      .innerJoin(businessesTable, eq(businessUpdatesTable.businessId, businessesTable.id))
      .where(and(...conditions))
      .orderBy(desc(businessUpdatesTable.publishedAt))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const resultRows = rows.slice(0, limit);

    let nextCursor: string | null = null;
    if (hasMore && resultRows.length > 0) {
      const last = resultRows[resultRows.length - 1];
      nextCursor = Buffer.from(JSON.stringify({ publishedAt: last.publishedAt, id: last.id })).toString("base64url");
    }

    void logSearch(marketplace.id, q, { entityType: "update", businessId, updateType }, resultRows.length, (req as any).user?.id, Date.now() - t0, req.ip);
    sendPaginated(res, resultRows, nextCursor);
  } catch (err) {
    next(err);
  }
});

export default router;
