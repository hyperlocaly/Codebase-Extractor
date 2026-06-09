import { eq, and, gte, lt, count, countDistinct, sql } from "drizzle-orm";
import type { Db } from "@workspace/db";
import {
  businessAnalyticsDailyTable,
  marketplaceAnalyticsDailyTable,
  engagementEventsTable,
  searchLogsTable,
  businessesTable,
  savedItemsTable,
} from "@workspace/db";
import type { BackgroundJob } from "@workspace/db";
import { logger } from "../../../lib/logger";

export async function handleBusinessAnalyticsAggregation(job: BackgroundJob, db: Db): Promise<void> {
  const { businessId, date: dateStr } = job.payload as { businessId: string; date?: string };
  if (!businessId) throw new Error("Missing businessId");

  const date = dateStr ? new Date(dateStr) : new Date();
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayEnd = new Date(dayStart.getTime() + 86400000);
  const dateLabel = dayStart.toISOString().slice(0, 10);

  logger.debug({ businessId, date: dateLabel }, "Aggregating business analytics");

  type EventCountRow = { eventType: string; count: string | number };

  const eventCounts: EventCountRow[] = await db
    .select({ eventType: engagementEventsTable.eventType, count: count(engagementEventsTable.id) })
    .from(engagementEventsTable)
    .where(
      and(
        eq(engagementEventsTable.businessId, businessId),
        gte(engagementEventsTable.occurredAt, dayStart),
        lt(engagementEventsTable.occurredAt, dayEnd),
      ),
    )
    .groupBy(engagementEventsTable.eventType) as EventCountRow[];

  const get = (type: string) => Number(eventCounts.find((e) => e.eventType === type)?.count ?? 0);

  const [saveCount] = await db
    .select({ count: count(savedItemsTable.id) })
    .from(savedItemsTable)
    .where(
      and(
        eq(savedItemsTable.entityType, "business"),
        eq(savedItemsTable.entityId, businessId),
        gte(savedItemsTable.createdAt, dayStart),
        lt(savedItemsTable.createdAt, dayEnd),
      ),
    );

  await db
    .insert(businessAnalyticsDailyTable)
    .values({
      businessId,
      date: dateLabel,
      profileViews: get("profile_view"),
      whatsappClicks: get("whatsapp_click"),
      callClicks: get("call_click"),
      shareClicks: get("share"),
      saves: Number(saveCount?.count ?? 0),
      productViews: get("product_view"),
      serviceViews: get("service_view"),
      portfolioViews: get("portfolio_view"),
      updateViews: get("update_view"),
      searchAppearances: get("search_impression"),
      searchClicks: get("search_click"),
    })
    .onConflictDoUpdate({
      target: [businessAnalyticsDailyTable.businessId, businessAnalyticsDailyTable.date],
      set: {
        profileViews: get("profile_view"),
        whatsappClicks: get("whatsapp_click"),
        callClicks: get("call_click"),
        shareClicks: get("share"),
        saves: Number(saveCount?.count ?? 0),
        productViews: get("product_view"),
        serviceViews: get("service_view"),
        portfolioViews: get("portfolio_view"),
        updateViews: get("update_view"),
        searchAppearances: get("search_impression"),
        searchClicks: get("search_click"),
        updatedAt: new Date(),
      },
    });

  logger.info({ businessId, date: dateLabel }, "Business analytics aggregated");
}

export async function handleMarketplaceAnalyticsAggregation(job: BackgroundJob, db: Db): Promise<void> {
  const { marketplaceId, date: dateStr } = job.payload as { marketplaceId: string; date?: string };
  if (!marketplaceId) throw new Error("Missing marketplaceId");

  const date = dateStr ? new Date(dateStr) : new Date();
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayEnd = new Date(dayStart.getTime() + 86400000);
  const dateLabel = dayStart.toISOString().slice(0, 10);

  logger.debug({ marketplaceId, date: dateLabel }, "Aggregating marketplace analytics");

  const [searchStats] = await db
    .select({
      total: count(searchLogsTable.id),
      zeroResults: sql<number>`COUNT(*) FILTER (WHERE ${searchLogsTable.resultCount} = 0)`,
      uniqueSearchers: countDistinct(searchLogsTable.userId),
    })
    .from(searchLogsTable)
    .where(
      and(
        eq(searchLogsTable.marketplaceId, marketplaceId),
        gte(searchLogsTable.createdAt, dayStart),
        lt(searchLogsTable.createdAt, dayEnd),
      ),
    );

  const [bizStats] = await db
    .select({
      total: count(businessesTable.id),
      newBiz: sql<number>`COUNT(*) FILTER (WHERE ${businessesTable.createdAt} >= ${dayStart} AND ${businessesTable.createdAt} < ${dayEnd})`,
      activeBiz: sql<number>`COUNT(*) FILTER (WHERE ${businessesTable.status} = 'active')`,
    })
    .from(businessesTable)
    .where(eq(businessesTable.marketplaceId, marketplaceId));

  const [engagementStats] = await db
    .select({ total: count(engagementEventsTable.id) })
    .from(engagementEventsTable)
    .where(
      and(
        eq(engagementEventsTable.marketplaceId, marketplaceId),
        gte(engagementEventsTable.occurredAt, dayStart),
        lt(engagementEventsTable.occurredAt, dayEnd),
      ),
    );

  await db
    .insert(marketplaceAnalyticsDailyTable)
    .values({
      marketplaceId,
      date: dateLabel,
      totalSearches: Number(searchStats?.total ?? 0),
      zeroResultSearches: Number(searchStats?.zeroResults ?? 0),
      uniqueSearchers: Number(searchStats?.uniqueSearchers ?? 0),
      totalBusinesses: Number(bizStats?.total ?? 0),
      newBusinesses: Number(bizStats?.newBiz ?? 0),
      activeBusinesses: Number(bizStats?.activeBiz ?? 0),
      totalEngagements: Number(engagementStats?.total ?? 0),
    })
    .onConflictDoUpdate({
      target: [marketplaceAnalyticsDailyTable.marketplaceId, marketplaceAnalyticsDailyTable.date],
      set: {
        totalSearches: Number(searchStats?.total ?? 0),
        zeroResultSearches: Number(searchStats?.zeroResults ?? 0),
        uniqueSearchers: Number(searchStats?.uniqueSearchers ?? 0),
        totalBusinesses: Number(bizStats?.total ?? 0),
        newBusinesses: Number(bizStats?.newBiz ?? 0),
        activeBusinesses: Number(bizStats?.activeBiz ?? 0),
        totalEngagements: Number(engagementStats?.total ?? 0),
        updatedAt: new Date(),
      },
    });

  logger.info({ marketplaceId, date: dateLabel }, "Marketplace analytics aggregated");
}
