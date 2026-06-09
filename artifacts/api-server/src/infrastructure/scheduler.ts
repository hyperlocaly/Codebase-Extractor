import cron, { type ScheduledTask } from "node-cron";
import { db } from "@workspace/db";
import { marketplacesTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { enqueueJob } from "./jobs/worker";
import { JOB_TYPES } from "./jobs/handlers";

let schedulerStarted = false;
const tasks: ScheduledTask[] = [];

/**
 * Enqueue analytics aggregation for all active marketplaces.
 * Runs daily at 01:00 UTC.
 */
async function scheduleAnalyticsAggregation(): Promise<void> {
  try {
    const marketplaces = await db
      .select({ id: marketplacesTable.id })
      .from(marketplacesTable)
      .where(db.$with !== undefined ? undefined : undefined); // just select all

    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const dateStr = yesterday.toISOString().slice(0, 10);

    for (const mp of marketplaces) {
      await enqueueJob(
        JOB_TYPES.MARKETPLACE_ANALYTICS,
        { marketplaceId: mp.id, date: dateStr },
        { priority: 3 },
      );
    }

    logger.info({ count: marketplaces.length, date: dateStr }, "Marketplace analytics aggregation jobs enqueued");
  } catch (err) {
    logger.error({ err }, "Failed to schedule analytics aggregation");
  }
}

/**
 * Process pending email notifications.
 * Runs every 5 minutes.
 */
async function scheduleNotificationDispatch(): Promise<void> {
  try {
    await enqueueJob(JOB_TYPES.NOTIFICATION_DISPATCH, {}, { priority: 5 });
    logger.debug("Notification dispatch job enqueued");
  } catch (err) {
    logger.error({ err }, "Failed to enqueue notification dispatch");
  }
}

/**
 * Reindex search documents for recently updated businesses.
 * Runs every 15 minutes.
 */
async function scheduleSearchSyncQueue(): Promise<void> {
  try {
    await enqueueJob(JOB_TYPES.SEARCH_SYNC_QUEUE, {}, { priority: 4 });
    logger.debug("Search sync queue job enqueued");
  } catch (err) {
    logger.error({ err }, "Failed to enqueue search sync queue");
  }
}

export function startScheduler(): void {
  if (schedulerStarted) return;
  schedulerStarted = true;

  // Daily analytics at 01:00 UTC
  tasks.push(
    cron.schedule("0 1 * * *", () => {
      void scheduleAnalyticsAggregation();
    }, { timezone: "UTC" }),
  );

  // Notification dispatch every 5 minutes
  tasks.push(
    cron.schedule("*/5 * * * *", () => {
      void scheduleNotificationDispatch();
    }),
  );

  // Search sync queue every 15 minutes
  tasks.push(
    cron.schedule("*/15 * * * *", () => {
      void scheduleSearchSyncQueue();
    }),
  );

  logger.info("Scheduler started (analytics daily@01:00 UTC, notifications every 5min, search-sync every 15min)");
}

export function stopScheduler(): void {
  for (const task of tasks) {
    task.stop();
  }
  tasks.length = 0;
  schedulerStarted = false;
  logger.info("Scheduler stopped");
}
