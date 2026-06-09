import { eq, and, lte, desc, sql, asc } from "drizzle-orm";
import { db } from "@workspace/db";
import { backgroundJobsTable } from "@workspace/db";
import { getJobHandler } from "./registry";
import { logger } from "../../lib/logger";
import { config } from "../../config";

async function claimNextJob() {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(backgroundJobsTable)
      .where(
        and(
          eq(backgroundJobsTable.status, "pending"),
          lte(backgroundJobsTable.scheduledFor, new Date()),
        ),
      )
      .orderBy(desc(backgroundJobsTable.priority), asc(backgroundJobsTable.scheduledFor))
      .limit(1)
      .for("update", { skipLocked: true });

    if (!row) return null;

    await tx
      .update(backgroundJobsTable)
      .set({ status: "running", startedAt: new Date() })
      .where(eq(backgroundJobsTable.id, row.id));

    return row;
  });
}

async function markDone(id: string): Promise<void> {
  await db
    .update(backgroundJobsTable)
    .set({ status: "done", finishedAt: new Date() })
    .where(eq(backgroundJobsTable.id, id));
}

async function markFailed(id: string, error: string, retryCount: number, maxRetries: number): Promise<void> {
  if (retryCount < maxRetries) {
    const backoffMs = Math.min(1000 * Math.pow(2, retryCount), 60000);
    const scheduledFor = new Date(Date.now() + backoffMs);

    await db
      .update(backgroundJobsTable)
      .set({
        status: "pending",
        retryCount: retryCount + 1,
        lastError: error,
        scheduledFor,
      })
      .where(eq(backgroundJobsTable.id, id));
  } else {
    await db
      .update(backgroundJobsTable)
      .set({
        status: "failed",
        finishedAt: new Date(),
        lastError: error,
      })
      .where(eq(backgroundJobsTable.id, id));
  }
}

async function processBatch(): Promise<number> {
  let processed = 0;

  for (let i = 0; i < config.jobs.batchSize; i++) {
    const job = await claimNextJob();
    if (!job) break;

    const handler = getJobHandler(job.jobType);
    if (!handler) {
      logger.warn({ jobId: job.id, jobType: job.jobType }, "No handler registered for job type");
      await markFailed(job.id, `No handler registered for job type: ${job.jobType}`, job.retryCount, job.maxRetries);
      continue;
    }

    try {
      logger.debug({ jobId: job.id, jobType: job.jobType }, "Processing background job");
      await handler(job, db);
      await markDone(job.id);
      processed++;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.error({ jobId: job.id, jobType: job.jobType, error: errMsg }, "Background job failed");
      await markFailed(job.id, errMsg, job.retryCount, job.maxRetries);
    }
  }

  return processed;
}

let running = false;
let intervalHandle: ReturnType<typeof setInterval> | null = null;

export function startJobWorker(): void {
  if (running) return;
  running = true;

  logger.info({ pollIntervalMs: config.jobs.pollIntervalMs }, "Job worker started");

  intervalHandle = setInterval(async () => {
    try {
      const count = await processBatch();
      if (count > 0) {
        logger.info({ count }, "Job batch processed");
      }
    } catch (err) {
      logger.error({ err }, "Job worker poll error");
    }
  }, config.jobs.pollIntervalMs);
}

export function stopJobWorker(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
  running = false;
  logger.info("Job worker stopped");
}

export async function enqueueJob(
  jobType: string,
  payload: Record<string, unknown>,
  options?: {
    priority?: number;
    scheduledFor?: Date;
    maxRetries?: number;
  },
): Promise<string> {
  const [job] = await db
    .insert(backgroundJobsTable)
    .values({
      jobType,
      payload,
      status: "pending",
      priority: options?.priority ?? 5,
      scheduledFor: options?.scheduledFor ?? new Date(),
      maxRetries: options?.maxRetries ?? 3,
    })
    .returning({ id: backgroundJobsTable.id });

  return job!.id;
}
