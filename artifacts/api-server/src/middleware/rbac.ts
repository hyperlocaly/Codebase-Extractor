import type { Request, Response, NextFunction } from "express";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  userRolesTable,
  rolesTable,
  rolePermissionsTable,
  permissionsTable,
} from "@workspace/db";
import { UnauthorizedError, ForbiddenError } from "../shared/errors";
import { logger } from "../lib/logger";

interface PermissionCache {
  codes: Set<string>;
  expiresAt: number;
}

const permissionCache = new Map<string, PermissionCache>();
const CACHE_TTL_MS = 60 * 1000;

async function getUserPermissions(
  userId: string,
  marketplaceId?: string,
  businessId?: string,
): Promise<Set<string>> {
  const cacheKey = `${userId}:${marketplaceId ?? "global"}:${businessId ?? "none"}`;
  const cached = permissionCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.codes;
  }

  const rows = await db
    .select({ code: permissionsTable.code })
    .from(userRolesTable)
    .innerJoin(rolesTable, eq(userRolesTable.roleId, rolesTable.id))
    .innerJoin(
      rolePermissionsTable,
      eq(rolePermissionsTable.roleId, rolesTable.id),
    )
    .innerJoin(
      permissionsTable,
      eq(permissionsTable.id, rolePermissionsTable.permissionId),
    )
    .where(
      and(
        eq(userRolesTable.userId, userId),
        eq(userRolesTable.isActive, true),
      ),
    );

  const codes = new Set(rows.map((r) => r.code));
  permissionCache.set(cacheKey, { codes, expiresAt: Date.now() + CACHE_TTL_MS });
  return codes;
}

export function requirePermission(permissionCode: string) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    try {
      const marketplaceId = req.marketplace?.id;
      const rawBizId = req.params["businessId"];
      const businessId = typeof rawBizId === "string" ? rawBizId : undefined;

      const permissions = await getUserPermissions(
        req.user.id,
        marketplaceId,
        businessId,
      );

      if (!permissions.has(permissionCode)) {
        logger.debug(
          {
            userId: req.user.id,
            required: permissionCode,
            marketplaceId,
          },
          "Permission denied",
        );
        return next(new ForbiddenError(`Permission required: ${permissionCode}`));
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requireAnyPermission(permissionCodes: string[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) return next(new UnauthorizedError());

    try {
      const permissions = await getUserPermissions(
        req.user.id,
        req.marketplace?.id,
      );

      const hasAny = permissionCodes.some((code) => permissions.has(code));
      if (!hasAny) {
        return next(new ForbiddenError());
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

export function invalidatePermissionCache(userId: string): void {
  for (const key of permissionCache.keys()) {
    if (key.startsWith(`${userId}:`)) {
      permissionCache.delete(key);
    }
  }
}
