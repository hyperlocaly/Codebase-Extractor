import app from "./app";
import { logger } from "./lib/logger";
import { config } from "./config";
import { startOutboxWorker, stopOutboxWorker } from "./infrastructure/outbox/worker";
import { startJobWorker, stopJobWorker } from "./infrastructure/jobs/worker";
import { registerAllJobHandlers } from "./infrastructure/jobs/handlers";
import { startScheduler, stopScheduler } from "./infrastructure/scheduler";
import { pool } from "@workspace/db";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Register all background job handlers
registerAllJobHandlers();

if (!config.email.smtpHost) {
  logger.warn("SMTP not configured — email delivery is disabled. Set SMTP_HOST to enable.");
}

/**
 * Ensure pg_trgm is installed before the server begins accepting search
 * requests.  post-merge.sh runs this via `pnpm --filter @workspace/db
 * run setup:extensions`, but that script may not have executed on a fresh
 * database (e.g. first boot, CI, new developer machine).  Running
 * CREATE EXTENSION IF NOT EXISTS here is idempotent and safe.
 */
async function ensurePgTrgm(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("CREATE EXTENSION IF NOT EXISTS pg_trgm;");
    logger.info("pg_trgm extension ready");
  } catch (err) {
    // Non-fatal: some managed Postgres instances restrict extension creation
    // to superusers.  Search will fall back to ILIKE-only matching.
    logger.warn(
      { err },
      "pg_trgm setup failed — similarity search may be degraded. " +
        "Run: CREATE EXTENSION IF NOT EXISTS pg_trgm; as a superuser.",
    );
  } finally {
    client.release();
  }
}

const server = app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");

  // Ensure search extension is present before workers start processing events
  // that might trigger search-sync jobs.
  ensurePgTrgm().then(() => {
    startOutboxWorker();
    startJobWorker();
    startScheduler();
  }).catch((startupErr) => {
    // ensurePgTrgm itself never throws (errors are caught internally), but
    // guard here to prevent a silent hang if something unexpected occurs.
    logger.error({ err: startupErr }, "Startup error during pg_trgm check");
    startOutboxWorker();
    startJobWorker();
    startScheduler();
  });
});

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, "Shutdown signal received, starting graceful shutdown");

  // Stop accepting new connections
  server.close(async (err) => {
    if (err) logger.error({ err }, "Error during server close");

    // Stop workers and scheduler
    stopOutboxWorker();
    stopJobWorker();
    stopScheduler();

    // Close DB pool
    try {
      await pool.end();
      logger.info("Database pool closed");
    } catch (dbErr) {
      logger.error({ err: dbErr }, "Error closing database pool");
    }

    logger.info("Graceful shutdown complete");
    process.exit(err ? 1 : 0);
  });

  // Force exit if shutdown takes too long
  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 15000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception");
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled rejection");
  process.exit(1);
});
