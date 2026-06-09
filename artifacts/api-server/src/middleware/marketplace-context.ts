import type { Request, Response, NextFunction } from "express";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@workspace/db";
import { marketplacesTable } from "@workspace/db";
import { MarketplaceNotFoundError } from "../shared/errors";
import { logger } from "../lib/logger";

export interface MarketplaceContext {
  id: string;
  slug: string;
  name: string;
  countryId: string;
  currencyId: string;
  organizationId: string;
  status: string;
}

declare global {
  namespace Express {
    interface Request {
      marketplace?: MarketplaceContext;
    }
  }
}

const cache = new Map<string, { data: MarketplaceContext; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

async function resolveMarketplace(slug: string): Promise<MarketplaceContext | null> {
  const cached = cache.get(slug);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const [mp] = await db
    .select({
      id: marketplacesTable.id,
      slug: marketplacesTable.slug,
      name: marketplacesTable.name,
      countryId: marketplacesTable.countryId,
      currencyId: marketplacesTable.currencyId,
      organizationId: marketplacesTable.organizationId,
      status: marketplacesTable.status,
    })
    .from(marketplacesTable)
    .where(
      and(
        eq(marketplacesTable.slug, slug),
        isNull(marketplacesTable.deletedAt),
      ),
    );

  if (!mp || mp.status === "archived") return null;

  const ctx: MarketplaceContext = mp;
  cache.set(slug, { data: ctx, expiresAt: Date.now() + CACHE_TTL_MS });
  return ctx;
}

export function requireMarketplace(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const slug =
    req.params["marketplaceSlug"] ??
    req.headers["x-marketplace-slug"] ??
    req.query["marketplace"];

  if (!slug || typeof slug !== "string") {
    return next(new MarketplaceNotFoundError("(missing)"));
  }

  resolveMarketplace(slug)
    .then((mp) => {
      if (!mp) return next(new MarketplaceNotFoundError(slug));
      req.marketplace = mp;
      next();
    })
    .catch((err) => {
      logger.error({ err, slug }, "Marketplace resolution error");
      next(err);
    });
}

export function invalidateMarketplaceCache(slug: string): void {
  cache.delete(slug);
}
