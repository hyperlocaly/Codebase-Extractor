import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { locationsTable, countriesTable } from "@workspace/db";
import { sendPaginated } from "../../shared/response";
import { ValidationError } from "../../shared/errors";

const router: IRouter = Router();

/**
 * GET /api/v1/locations/search
 * Trigram + prefix search across the location hierarchy.
 * Supports: ?q=, ?country=, ?level=, ?parent=, ?limit=, ?cursor=
 */
router.get("/", async (req, res, next): Promise<void> => {
  try {
    const {
      q,
      country,
      level,
      parent,
      limit: rawLimit,
      cursor: rawCursor,
    } = req.query as Record<string, string | undefined>;

    if (!q || q.trim().length < 1) {
      return next(new ValidationError("q (search query) is required"));
    }

    const term = q.trim();
    const limit = Math.min(Math.max(Number(rawLimit ?? "20"), 1), 100);

    // Build WHERE conditions as raw SQL fragments
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    // Country filter
    if (country) {
      const [c] = await db
        .select({ id: countriesTable.id })
        .from(countriesTable)
        .where(sql`${countriesTable.isoCode} = ${country.toUpperCase()}`);
      if (c) {
        conditions.push(`l.country_id = $${paramIdx++}`);
        params.push(c.id);
      }
    }

    // Level filter
    if (level) {
      conditions.push(`l.level_number = $${paramIdx++}`);
      params.push(Number(level));
    }

    // Parent location filter (by slug)
    if (parent) {
      const [p] = await db
        .select({ id: locationsTable.id })
        .from(locationsTable)
        .where(sql`${locationsTable.slug} = ${parent}`);
      if (p) {
        conditions.push(`l.parent_id = $${paramIdx++}`);
        params.push(p.id);
      }
    }

    // Active only
    conditions.push("l.is_active = true");

    // Cursor (createdAt + id offset pagination)
    if (rawCursor) {
      try {
        const decoded = Buffer.from(rawCursor, "base64url").toString("utf8");
        const { score, id } = JSON.parse(decoded) as {
          score: number;
          id: string;
        };
        conditions.push(
          `(similarity(l.name, $${paramIdx}) < $${paramIdx + 1} OR (similarity(l.name, $${paramIdx + 2}) = $${paramIdx + 3} AND l.id < $${paramIdx + 4}))`,
        );
        params.push(term, score, term, score, id);
        paramIdx += 5;
      } catch {
        // ignore invalid cursor
      }
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const searchParam = `$${paramIdx++}`;
    params.push(term);
    const thresholdParam = `$${paramIdx++}`;
    params.push(0.15);

    const query = `
      SELECT
        l.id,
        l.name,
        l.slug,
        l.full_name,
        l.level_number,
        l.parent_id,
        c.name AS country_name,
        c.iso_code AS country_iso,
        similarity(l.name, ${searchParam}) AS score
      FROM locations l
      JOIN countries c ON c.id = l.country_id
      ${whereClause}
        ${conditions.length > 0 ? "AND" : "WHERE"} (
          l.name ILIKE '%' || ${searchParam} || '%'
          OR similarity(l.name, ${searchParam}) > ${thresholdParam}
          OR l.slug ILIKE '%' || ${searchParam} || '%'
        )
      ORDER BY score DESC, l.level_number ASC, l.sort_order ASC
      LIMIT ${limit + 1}
    `;

    const { rows } = await (db as any).$client.query(query, params);

    const hasMore = rows.length > limit;
    const resultRows = rows.slice(0, limit);

    let nextCursor: string | null = null;
    if (hasMore && resultRows.length > 0) {
      const last = resultRows[resultRows.length - 1];
      nextCursor = Buffer.from(
        JSON.stringify({ score: last.score, id: last.id }),
      ).toString("base64url");
    }

    sendPaginated(
      res,
      resultRows.map((r: any) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        fullName: r.full_name,
        levelNumber: r.level_number,
        parentId: r.parent_id,
        country: { name: r.country_name, isoCode: r.country_iso },
        score: Number(r.score).toFixed(3),
      })),
      nextCursor,
    );
  } catch (err) {
    next(err);
  }
});

export default router;
