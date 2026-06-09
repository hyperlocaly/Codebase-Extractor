function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Required environment variable "${key}" is not set`);
  return val;
}

function optionalEnv(key: string, fallback?: string): string | undefined {
  return process.env[key] ?? fallback;
}

export const config = {
  nodeEnv: (process.env["NODE_ENV"] ?? "development") as "development" | "production" | "test",
  port: Number(process.env["PORT"] ?? 5000),

  database: {
    url: requireEnv("DATABASE_URL"),
  },

  auth: {
    jwtSecret: requireEnv("SESSION_SECRET"),
    jwtExpiresIn: optionalEnv("JWT_EXPIRES_IN", "7d") as string,
    bcryptRounds: 12,
    tokenExpiryMs: 7 * 24 * 60 * 60 * 1000,
  },

  outbox: {
    pollIntervalMs: Number(optionalEnv("OUTBOX_POLL_INTERVAL_MS", "1000")),
    batchSize: Number(optionalEnv("OUTBOX_BATCH_SIZE", "50")),
    maxRetries: Number(optionalEnv("OUTBOX_MAX_RETRIES", "5")),
  },

  jobs: {
    pollIntervalMs: Number(optionalEnv("JOBS_POLL_INTERVAL_MS", "5000")),
    batchSize: Number(optionalEnv("JOBS_BATCH_SIZE", "10")),
  },

  storage: {
    provider: optionalEnv("STORAGE_PROVIDER", "s3") as string,
    bucket: optionalEnv("STORAGE_BUCKET"),
    region: optionalEnv("AWS_REGION", "us-east-1"),
    endpoint: optionalEnv("STORAGE_ENDPOINT"),
  },

  email: {
    smtpHost: optionalEnv("SMTP_HOST"),
    smtpPort: Number(optionalEnv("SMTP_PORT", "587")),
    smtpUser: optionalEnv("SMTP_USER"),
    smtpPass: optionalEnv("SMTP_PASS"),
    fromAddress: optionalEnv("EMAIL_FROM", "noreply@hbe.local"),
    fromName: optionalEnv("EMAIL_FROM_NAME", "HBE Platform"),
  },

  rateLimit: {
    windowMs: 60 * 1000,
    maxPublic: Number(optionalEnv("RATE_LIMIT_PUBLIC", "100")),
    maxAuthenticated: Number(optionalEnv("RATE_LIMIT_AUTHED", "500")),
  },
} as const;

export type Config = typeof config;
