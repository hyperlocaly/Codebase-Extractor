import { eq, and, isNull, sql } from "drizzle-orm";
import type { Db } from "@workspace/db";
import {
  businessesTable,
  businessTypeAssignmentsTable,
  categoriesTable,
  locationsTable,
  searchDocumentsTable,
  searchSyncQueueTable,
  businessListCacheTable,
  mediaTable,
} from "@workspace/db";
import type { BackgroundJob } from "@workspace/db";
import { logger } from "../../../lib/logger";

export async function handleSearchSync(job: BackgroundJob, db: Db): Promise<void> {
  const { entityType, entityId, marketplaceId, operation } = job.payload as {
    entityType: string;
    entityId: string;
    marketplaceId: string;
    operation: "upsert" | "delete";
  };

  logger.debug({ entityType, entityId, operation }, "Syncing search document");

  if (operation === "delete") {
    await db
      .delete(searchDocumentsTable)
      .where(
        and(
          eq(searchDocumentsTable.entityType, entityType),
          eq(searchDocumentsTable.entityId, entityId),
        ),
      );
    logger.info({ entityType, entityId }, "Search document deleted");
    return;
  }

  if (entityType === "business") {
    const [biz] = await db
      .select({
        id: businessesTable.id,
        name: businessesTable.name,
        slug: businessesTable.slug,
        tagline: businessesTable.tagline,
        description: businessesTable.description,
        locationId: businessesTable.locationId,
        verificationScore: businessesTable.verificationScore,
        status: businessesTable.status,
        claimStatus: businessesTable.claimStatus,
        whatsappNumber: businessesTable.whatsappNumber,
        primaryPhone: businessesTable.primaryPhone,
        primaryEmail: businessesTable.primaryEmail,
        latitude: businessesTable.latitude,
        longitude: businessesTable.longitude,
        publishedAt: businessesTable.publishedAt,
      })
      .from(businessesTable)
      .where(and(eq(businessesTable.id, entityId), isNull(businessesTable.deletedAt)));

    if (!biz) {
      logger.warn({ entityId }, "Business not found during search sync");
      return;
    }

    const categories = await db
      .select({ id: categoriesTable.id, isPrimary: businessTypeAssignmentsTable.isPrimary })
      .from(businessTypeAssignmentsTable)
      .innerJoin(categoriesTable, eq(businessTypeAssignmentsTable.categoryId, categoriesTable.id))
      .where(eq(businessTypeAssignmentsTable.businessId, entityId));

    const primaryCategory = categories.find((c) => c.isPrimary);

    const [logo] = await db
      .select({ storageKey: mediaTable.storageKey })
      .from(mediaTable)
      .where(
        and(
          eq(mediaTable.entityType, "business"),
          eq(mediaTable.entityId, entityId),
          eq(mediaTable.purpose, "logo"),
          eq(mediaTable.status, "active"),
          eq(mediaTable.isPrimary, true),
        ),
      )
      .limit(1);

    const searchVector = sql`to_tsvector('english', ${biz.name} || ' ' || COALESCE(${biz.tagline ?? ""}, '') || ' ' || COALESCE(${biz.description ?? ""}, ''))`;

    const title = biz.name;
    const description = [biz.tagline, biz.description].filter(Boolean).join(" — ");

    await db
      .insert(searchDocumentsTable)
      .values({
        entityType: "business",
        entityId,
        marketplaceId,
        title,
        description: description || null,
        searchVector: searchVector as any,
        locationId: biz.locationId ?? null,
        verificationScore: biz.verificationScore ?? null,
      })
      .onConflictDoUpdate({
        target: [searchDocumentsTable.entityType, searchDocumentsTable.entityId],
        set: {
          title,
          description: description || null,
          searchVector: searchVector as any,
          locationId: biz.locationId ?? null,
          verificationScore: biz.verificationScore ?? null,
          updatedAt: new Date(),
        },
      });

    // Update business list cache
    await db
      .insert(businessListCacheTable)
      .values({
        businessId: entityId,
        marketplaceId,
        name: biz.name,
        slug: biz.slug,
        locationId: biz.locationId ?? null,
        primaryCategoryId: primaryCategory?.id ?? null,
        verificationScore: biz.verificationScore ?? "0",
        totalScore: biz.verificationScore ?? "0",
        claimStatus: biz.claimStatus,
        status: biz.status,
        whatsappNumber: biz.whatsappNumber ?? null,
        primaryPhone: biz.primaryPhone ?? null,
        primaryEmail: biz.primaryEmail ?? null,
        hasLogo: !!logo,
        logoUrl: logo ? logo.storageKey : null,
        latitude: biz.latitude ?? null,
        longitude: biz.longitude ?? null,
        lastEventAt: new Date(),
      })
      .onConflictDoUpdate({
        target: businessListCacheTable.businessId,
        set: {
          name: biz.name,
          slug: biz.slug,
          locationId: biz.locationId ?? null,
          primaryCategoryId: primaryCategory?.id ?? null,
          verificationScore: biz.verificationScore ?? "0",
          totalScore: biz.verificationScore ?? "0",
          claimStatus: biz.claimStatus,
          status: biz.status,
          whatsappNumber: biz.whatsappNumber ?? null,
          primaryPhone: biz.primaryPhone ?? null,
          primaryEmail: biz.primaryEmail ?? null,
          hasLogo: !!logo,
          logoUrl: logo ? logo.storageKey : null,
          latitude: biz.latitude ?? null,
          longitude: biz.longitude ?? null,
          lastEventAt: new Date(),
          updatedAt: new Date(),
        },
      });

    logger.info({ entityId }, "Business search document synced");
  }
}

export async function handleSearchSyncQueue(job: BackgroundJob, db: Db): Promise<void> {
  // Process all pending items from search_sync_queue
  const pending = await db
    .select()
    .from(searchSyncQueueTable)
    .where(
      and(
        isNull(searchSyncQueueTable.processedAt),
        sql`${searchSyncQueueTable.attemptCount} < 5`,
      ),
    )
    .limit(50);

  for (const item of pending) {
    try {
      await handleSearchSync(
        {
          ...job,
          payload: {
            entityType: item.entityType,
            entityId: item.entityId,
            marketplaceId: item.marketplaceId,
            operation: item.operation,
          },
        },
        db,
      );

      await db
        .update(searchSyncQueueTable)
        .set({ processedAt: new Date() })
        .where(eq(searchSyncQueueTable.id, item.id));
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await db
        .update(searchSyncQueueTable)
        .set({
          attemptCount: item.attemptCount + 1,
          lastError: errMsg,
          nextAttemptAt: new Date(Date.now() + Math.pow(2, item.attemptCount) * 60000),
        })
        .where(eq(searchSyncQueueTable.id, item.id));
    }
  }
}
