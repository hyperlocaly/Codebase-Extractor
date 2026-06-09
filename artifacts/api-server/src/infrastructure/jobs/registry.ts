import type { BackgroundJob } from "@workspace/db";
import type { Db } from "@workspace/db";
import { logger } from "../../lib/logger";

export type JobHandler = (job: BackgroundJob, db: Db) => Promise<void>;

const registry = new Map<string, JobHandler>();

export function registerJobHandler(jobType: string, handler: JobHandler): void {
  if (registry.has(jobType)) {
    logger.warn({ jobType }, "Overwriting existing job handler registration");
  }
  registry.set(jobType, handler);
  logger.debug({ jobType }, "Job handler registered");
}

export function getJobHandler(jobType: string): JobHandler | undefined {
  return registry.get(jobType);
}

export function listRegisteredJobTypes(): string[] {
  return [...registry.keys()];
}
