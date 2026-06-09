import { registerJobHandler } from "../registry";
import { handleScoreRecalculation } from "./score-recalculation";
import { handleBusinessAnalyticsAggregation, handleMarketplaceAnalyticsAggregation } from "./analytics-aggregation";
import { handleSearchSync, handleSearchSyncQueue } from "./search-sync";
import { handleNotificationDispatch } from "./notification-dispatch";
import { logger } from "../../../lib/logger";

export const JOB_TYPES = {
  SCORE_RECALCULATION: "score_recalculation",
  BUSINESS_ANALYTICS: "business_analytics_aggregation",
  MARKETPLACE_ANALYTICS: "marketplace_analytics_aggregation",
  SEARCH_SYNC: "search_sync",
  SEARCH_SYNC_QUEUE: "search_sync_queue",
  NOTIFICATION_DISPATCH: "notification_dispatch",
} as const;

export type JobType = (typeof JOB_TYPES)[keyof typeof JOB_TYPES];

export function registerAllJobHandlers(): void {
  registerJobHandler(JOB_TYPES.SCORE_RECALCULATION, handleScoreRecalculation);
  registerJobHandler(JOB_TYPES.BUSINESS_ANALYTICS, handleBusinessAnalyticsAggregation);
  registerJobHandler(JOB_TYPES.MARKETPLACE_ANALYTICS, handleMarketplaceAnalyticsAggregation);
  registerJobHandler(JOB_TYPES.SEARCH_SYNC, handleSearchSync);
  registerJobHandler(JOB_TYPES.SEARCH_SYNC_QUEUE, handleSearchSyncQueue);
  registerJobHandler(JOB_TYPES.NOTIFICATION_DISPATCH, handleNotificationDispatch);

  logger.info({ handlers: Object.values(JOB_TYPES) }, "All job handlers registered");
}
