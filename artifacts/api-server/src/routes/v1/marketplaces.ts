import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  marketplacesTable,
  organizationsTable,
  countriesTable,
  currenciesTable,
  categoriesTable,
} from "@workspace/db";
import { sendSuccess } from "../../shared/response";
import { NotFoundError } from "../../shared/errors";

const router: IRouter = Router();

router.get("/:slug", async (req, res, next): Promise<void> => {
  try {
    const { slug } = req.params;

    const [mp] = await db
      .select({
        id: marketplacesTable.id,
        slug: marketplacesTable.slug,
        name: marketplacesTable.name,
        tagline: marketplacesTable.tagline,
        description: marketplacesTable.description,
        status: marketplacesTable.status,
        domain: marketplacesTable.domain,
        logoUrl: marketplacesTable.logoUrl,
        primaryColor: marketplacesTable.primaryColor,
        country: {
          id: countriesTable.id,
          name: countriesTable.name,
          isoCode: countriesTable.isoCode,
          phoneCode: countriesTable.phoneCode,
        },
        currency: {
          id: currenciesTable.id,
          code: currenciesTable.code,
          name: currenciesTable.name,
          symbol: currenciesTable.symbol,
        },
        organization: {
          id: organizationsTable.id,
          name: organizationsTable.name,
          slug: organizationsTable.slug,
        },
        createdAt: marketplacesTable.createdAt,
      })
      .from(marketplacesTable)
      .innerJoin(countriesTable, eq(marketplacesTable.countryId, countriesTable.id))
      .innerJoin(currenciesTable, eq(marketplacesTable.currencyId, currenciesTable.id))
      .innerJoin(organizationsTable, eq(marketplacesTable.organizationId, organizationsTable.id))
      .where(
        and(
          eq(marketplacesTable.slug, slug),
          isNull(marketplacesTable.deletedAt),
        ),
      );

    if (!mp || mp.status === "archived") {
      return next(new NotFoundError("Marketplace", slug));
    }

    sendSuccess(res, mp);
  } catch (err) {
    next(err);
  }
});

export default router;
