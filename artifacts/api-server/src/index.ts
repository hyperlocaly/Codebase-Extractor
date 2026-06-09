import app from "./app";
import { logger } from "./lib/logger";
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

const server = app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");

  // Start background workers and scheduler after server is up
  startOutboxWorker();
  startJobWorker();
  startScheduler();
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
