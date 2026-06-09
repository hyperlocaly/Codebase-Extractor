import { eq, and, lt, asc, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  domainEventOutboxTable,
  deadLetterEventsTable,
  consumerCheckpointsTable,
} from "@workspace/db";
import { logger } from "../../lib/logger";
import { config } from "../../config";
import { handleDomainEvent } from "./event-handlers";

const WORKER_NAME = "outbox-publisher";

async function claimBatch(batchSize: number) {
  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(domainEventOutboxTable)
      .where(eq(domainEventOutboxTable.status, "pending"))
      .orderBy(asc(domainEventOutboxTable.createdAt))
      .limit(batchSize)
      .for("update", { skipLocked: true });

    if (rows.length === 0) return [];

    const ids = rows.map((r) => r.id);
    await tx
      .update(domainEventOutboxTable)
      .set({ status: "processing" })
      .where(
        sql`${domainEventOutboxTable.id} = ANY(${sql.raw(`'{${ids.join(",")}}'::uuid[]`)})`,
      );

    return rows;
  });
}

async function markPublished(id: string): Promise<void> {
  await db
    .update(domainEventOutboxTable)
    .set({ status: "published", publishedAt: new Date() })
    .where(eq(domainEventOutboxTable.id, id));
}

async function markFailed(
  id: string,
  error: string,
  retryCount: number,
  maxRetries: number,
): Promise<void> {
  if (retryCount >= maxRetries) {
    await db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(domainEventOutboxTable)
        .where(eq(domainEventOutboxTable.id, id));

      if (row) {
        await tx.insert(deadLetterEventsTable).values({
          originalEventId: row.id,
          eventType: row.eventType,
          payload: row.payload as Record<string, unknown>,
          failureReason: error,
          retryCount: row.retryCount,
        });
      }

      await tx
        .update(domainEventOutboxTable)
        .set({ status: "failed", lastError: error })
        .where(eq(domainEventOutboxTable.id, id));
    });
  } else {
    await db
      .update(domainEventOutboxTable)
      .set({
        status: "pending",
        retryCount: retryCount + 1,
        lastError: error,
      })
      .where(eq(domainEventOutboxTable.id, id));
  }
}

async function updateCheckpoint(lastEventId: string): Promise<void> {
  await db
    .insert(consumerCheckpointsTable)
    .values({
      consumerName: WORKER_NAME,
      lastEventId,
      processedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: consumerCheckpointsTable.consumerName,
      set: {
        lastEventId,
        processedAt: new Date(),
        updatedAt: new Date(),
      },
    });
}

async function processBatch(): Promise<number> {
  const rows = await claimBatch(config.outbox.batchSize);
  if (rows.length === 0) return 0;

  let processed = 0;
  for (const row of rows) {
    try {
      logger.debug(
        { eventId: row.id, eventType: row.eventType },
        "Publishing outbox event",
      );

      // Dispatch event to registered handlers (notifications, search sync, etc.)
      await handleDomainEvent({
        id: row.id,
        eventType: row.eventType,
        aggregateType: row.aggregateType,
        aggregateId: row.aggregateId,
        payload: row.payload as Record<string, unknown>,
      });

      await markPublished(row.id);
      await updateCheckpoint(row.id);
      processed++;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.error(
        { eventId: row.id, eventType: row.eventType, error: errMsg },
        "Outbox event processing failed",
      );
      await markFailed(row.id, errMsg, row.retryCount, config.outbox.maxRetries);
    }
  }

  return processed;
}

let running = false;
let intervalHandle: ReturnType<typeof setInterval> | null = null;

export function startOutboxWorker(): void {
  if (running) return;
  running = true;

  logger.info(
    { pollIntervalMs: config.outbox.pollIntervalMs },
    "Outbox worker started",
  );

  intervalHandle = setInterval(async () => {
    try {
      const count = await processBatch();
      if (count > 0) {
        logger.info({ count }, "Outbox batch processed");
      }
    } catch (err) {
      logger.error({ err }, "Outbox worker poll error");
    }
  }, config.outbox.pollIntervalMs);
}

export function stopOutboxWorker(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
  running = false;
  logger.info("Outbox worker stopped");
}
