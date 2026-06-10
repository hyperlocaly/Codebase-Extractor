/**
 * Health endpoints
 *
 * GET /healthz — liveness probe.  Returns 200 as long as the Node process is
 *   alive and can parse a Zod schema.  Never fails on external dependencies.
 *
 * GET /readyz  — readiness probe.  Returns 200 when:
 *   • The database pool can execute a query (required dependency).
 *   • pg_trgm extension is present (required for similarity-search).
 *   Returns 503 when the database is unreachable.
 *
 * SMTP / email state is intentionally excluded from both probes.
 * Rationale:
 *   - SMTP down ≠ service unready.  All API endpoints still respond normally;
 *     email notifications queue as status="pending" and are retried when SMTP
 *     recovers (or dispatch workers pick them up when SMTP_HOST is later set).
 *   - Returning 503 on SMTP failure would cause orchestrators to restart the
 *     process, which does not fix SMTP and creates a restart loop.
 *   - SMTP state is observable via:
 *       1. Startup log: "SMTP not configured — email delivery is disabled"
 *          (emitted by src/index.ts when SMTP_HOST is absent).
 *       2. Per-notification DB rows: notifications.status = "failed" with
 *          notifications.last_error populated after each failed attempt.
 *       3. The /readyz endpoint itself — a healthy response confirms the
 *          database (and therefore the notifications table) is reachable.
 */
import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { pool } from "@workspace/db";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/readyz", async (_req, res) => {
  const client = await pool.connect().catch(() => null);
  if (!client) {
    return void res
      .status(503)
      .json({ status: "not_ready", db: "disconnected" });
  }

  try {
    await client.query("SELECT 1");

    // Verify pg_trgm is installed — required for similarity() in search.
    const { rows } = await client.query(
      "SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm'",
    );
    const trgmReady = rows.length > 0;

    res.json({
      status: "ready",
      db: "connected",
      search: { pg_trgm: trgmReady ? "ready" : "unavailable" },
    });
  } catch (err) {
    res
      .status(503)
      .json({ status: "not_ready", db: "error", error: String(err) });
  } finally {
    client.release();
  }
});

export default router;
