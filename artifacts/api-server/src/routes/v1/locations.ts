import { Router, type IRouter } from "express";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@workspace/db";
import { locationsTable, locationLevelDefinitionsTable, countriesTable } from "@workspace/db";
import { sendSuccess } from "../../shared/response";
import { NotFoundError, ValidationError } from "../../shared/errors";

const router: IRouter = Router();

router.get("/", async (req, res, next): Promise<void> => {
  try {
    const { country, parent, level } = req.query as Record<string, string | undefined>;

    if (!country) {
      return next(new ValidationError("country query parameter is required (ISO code, e.g. NG)"));
    }

    const [countryRecord] = await db
      .select({ id: countriesTable.id, name: countriesTable.name })
      .from(countriesTable)
      .where(eq(countriesTable.isoCode, country.toUpperCase()));

    if (!countryRecord) return next(new NotFoundError("Country", country));

    let parentId: string | null = null;
    if (parent) {
      const [parentLoc] = await db
        .select({ id: locationsTable.id })
        .from(locationsTable)
        .where(and(eq(locationsTable.slug, parent), eq(locationsTable.countryId, countryRecord.id)));
      if (!parentLoc) return next(new NotFoundError("Location", parent));
      parentId = parentLoc.id;
    }

    const rows = await db
      .select({
        id: locationsTable.id,
        name: locationsTable.name,
        slug: locationsTable.slug,
        fullName: locationsTable.fullName,
        levelNumber: locationsTable.levelNumber,
        parentId: locationsTable.parentId,
        latitude: locationsTable.latitude,
        longitude: locationsTable.longitude,
      })
      .from(locationsTable)
      .where(
        and(
          eq(locationsTable.countryId, countryRecord.id),
          eq(locationsTable.isActive, true),
          parentId !== null
            ? eq(locationsTable.parentId, parentId)
            : isNull(locationsTable.parentId),
          level !== undefined
            ? eq(locationsTable.levelNumber, Number(level))
            : undefined,
        ),
      )
      .orderBy(locationsTable.sortOrder, locationsTable.name);

    sendSuccess(res, { country: countryRecord, locations: rows });
  } catch (err) {
    next(err);
  }
});

router.get("/:slug", async (req, res, next): Promise<void> => {
  try {
    const { slug } = req.params;
    const { country } = req.query as { country?: string };

    const conditions = [eq(locationsTable.slug, slug), eq(locationsTable.isActive, true)];

    if (country) {
      const [c] = await db
        .select({ id: countriesTable.id })
        .from(countriesTable)
        .where(eq(countriesTable.isoCode, country.toUpperCase()));
      if (c) conditions.push(eq(locationsTable.countryId, c.id));
    }

    const [location] = await db
      .select({
        id: locationsTable.id,
        name: locationsTable.name,
        slug: locationsTable.slug,
        fullName: locationsTable.fullName,
        levelNumber: locationsTable.levelNumber,
        parentId: locationsTable.parentId,
        latitude: locationsTable.latitude,
        longitude: locationsTable.longitude,
        countryId: locationsTable.countryId,
      })
      .from(locationsTable)
      .where(and(...conditions));

    if (!location) return next(new NotFoundError("Location", slug));

    const children = await db
      .select({
        id: locationsTable.id,
        name: locationsTable.name,
        slug: locationsTable.slug,
        fullName: locationsTable.fullName,
        levelNumber: locationsTable.levelNumber,
      })
      .from(locationsTable)
      .where(and(eq(locationsTable.parentId, location.id), eq(locationsTable.isActive, true)))
      .orderBy(locationsTable.sortOrder, locationsTable.name);

    sendSuccess(res, { ...location, children });
  } catch (err) {
    next(err);
  }
});

export default router;
