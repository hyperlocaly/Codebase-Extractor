import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import rateLimit from "express-rate-limit";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import router from "./routes";
import { logger } from "./lib/logger";
import { errorHandler } from "./middleware/error-handler";
import { config } from "./config";
import { register as promRegister, collectDefaultMetrics, Counter, Histogram } from "prom-client";

const app: Express = express();

// Trust one layer of reverse proxy (Replit's shared proxy)
app.set("trust proxy", 1);

// Prometheus default metrics
collectDefaultMetrics({ register: promRegister });

export const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
  registers: [promRegister],
});

export const httpRequestDurationMs = new Histogram({
  name: "http_request_duration_ms",
  help: "HTTP request duration in milliseconds",
  labelNames: ["method", "route"],
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
  registers: [promRegister],
});

// ── CORS ─────────────────────────────────────────────────────────────────────
// Allow all origins (frontend is on a different origin in development/preview).
// Explicitly whitelist the custom headers the frontend must send.
const ALLOWED_HEADERS = [
  "Authorization",
  "Content-Type",
  "X-Marketplace-Slug",
  "X-Request-Id",
  "X-Idempotency-Key",
  "Accept",
  "Origin",
];

const EXPOSED_HEADERS = [
  "X-Request-Id",
  "X-RateLimit-Limit",
  "X-RateLimit-Remaining",
  "X-RateLimit-Reset",
  "Retry-After",
];

app.use(
  cors({
    origin: true, // reflect request origin (allows any origin while in dev)
    credentials: true,
    allowedHeaders: ALLOWED_HEADERS,
    exposedHeaders: EXPOSED_HEADERS,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    maxAge: 86400, // preflight cache 24h
  }),
);

// ── Request ID ───────────────────────────────────────────────────────────────
// Attach a request-id so the frontend can correlate logs/errors
app.use((req, res, next) => {
  const id =
    (req.headers["x-request-id"] as string) ||
    `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  req.headers["x-request-id"] = id;
  res.setHeader("X-Request-Id", id);
  next();
});

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// Prometheus metrics collection middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const route = req.route?.path ?? req.path ?? "unknown";
    const method = req.method;
    const statusCode = String(res.statusCode);
    const durationMs = Date.now() - start;
    httpRequestsTotal.labels(method, route, statusCode).inc();
    httpRequestDurationMs.labels(method, route).observe(durationMs);
  });
  next();
});

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Health & Observability (no rate limiting) ────────────────────────────────

const healthResponse = (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
};

// Both paths for compatibility (OpenAPI spec uses /healthz, server also has /health)
app.get("/health", healthResponse);
app.get("/healthz", healthResponse);

const readinessResponse = async (_req: Request, res: Response) => {
  const emailStatus = config.email.smtpHost ? "configured" : "unconfigured";
  try {
    await db.execute(sql`SELECT 1`);
    res.status(200).json({ status: "ready", db: "ok", email: emailStatus, timestamp: new Date().toISOString() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ err: msg }, "Readiness check failed");
    res.status(503).json({ status: "not_ready", db: "error", email: emailStatus, timestamp: new Date().toISOString() });
  }
};

// Both paths for compatibility
app.get("/readiness", readinessResponse);
app.get("/api/v1/readyz", readinessResponse);

app.get("/metrics", async (_req: Request, res: Response) => {
  try {
    res.set("Content-Type", promRegister.contentType);
    res.end(await promRegister.metrics());
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// ── Rate Limiting ────────────────────────────────────────────────────────────

const rateLimitHandler = (_req: Request, res: Response) => {
  res.status(429).json({
    error: { code: "RATE_LIMITED", message: "Too many requests, please slow down." },
  });
};

// Auth endpoints: strict 20 req / 15 min
app.use(
  "/api/v1/auth",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
  }),
);

// General API: max requests per windowMs (default keying = IP, IPv6-safe)
app.use(
  "/api",
  rateLimit({
    windowMs: config.rateLimit.windowMs,
    limit: config.rateLimit.maxPublic,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
  }),
);

app.use("/api", router);
app.use(errorHandler);

export default app;
