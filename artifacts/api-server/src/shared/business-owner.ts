import { eq, and, isNull } from "drizzle-orm";
import { db } from "@workspace/db";
import { businessesTable, businessOwnersTable } from "@workspace/db";
import { NotFoundError, ForbiddenError } from "./errors";

/**
 * Asserts that:
 * 1. The business exists in the given marketplace and is not deleted.
 * 2. The user is an active owner of that business.
 *
 * Throws NotFoundError or ForbiddenError if either check fails.
 */
export async function assertBusinessOwner(
  businessId: string,
  userId: string,
  marketplaceId: string,
): Promise<void> {
  const [biz] = await db
    .select({ id: businessesTable.id })
    .from(businessesTable)
    .where(
      and(
        eq(businessesTable.id, businessId),
        eq(businessesTable.marketplaceId, marketplaceId),
        isNull(businessesTable.deletedAt),
      ),
    );
  if (!biz) throw new NotFoundError("Business", businessId);

  const [owner] = await db
    .select({ id: businessOwnersTable.id })
    .from(businessOwnersTable)
    .where(
      and(
        eq(businessOwnersTable.businessId, businessId),
        eq(businessOwnersTable.userId, userId),
        eq(businessOwnersTable.isActive, true),
      ),
    );
  if (!owner) throw new ForbiddenError("Not an owner of this business");
}
