function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Required environment variable "${name}" is not set`);
  return v;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

function optionalNum(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number(v);
  if (Number.isNaN(n)) throw new Error(`Environment variable "${name}" must be a number`);
  return n;
}

export const config = {
  auth: {
    jwtSecret: required("SESSION_SECRET"),
    jwtExpiresIn: optional("JWT_EXPIRES_IN", "7d"),
    bcryptRounds: optionalNum("BCRYPT_ROUNDS", 12),
    tokenExpiryMs: optionalNum("TOKEN_EXPIRY_MS", 7 * 24 * 60 * 60 * 1000), // 7 days
  },

  outbox: {
    pollIntervalMs: optionalNum("OUTBOX_POLL_INTERVAL_MS", 5000),
    batchSize: optionalNum("OUTBOX_BATCH_SIZE", 50),
    maxRetries: optionalNum("OUTBOX_MAX_RETRIES", 5),
  },

  jobs: {
    pollIntervalMs: optionalNum("JOBS_POLL_INTERVAL_MS", 10000),
    batchSize: optionalNum("JOBS_BATCH_SIZE", 10),
  },

  rateLimit: {
    windowMs: optionalNum("RATE_LIMIT_WINDOW_MS", 60 * 1000), // 1 minute
    maxPublic: optionalNum("RATE_LIMIT_MAX_PUBLIC", 100),
    maxAuthenticated: optionalNum("RATE_LIMIT_MAX_AUTH", 500),
  },

  email: {
    smtpHost: process.env["SMTP_HOST"] ?? null,
    smtpPort: optionalNum("SMTP_PORT", 587),
    smtpUser: process.env["SMTP_USER"] ?? null,
    smtpPass: process.env["SMTP_PASS"] ?? null,
    fromName: optional("EMAIL_FROM_NAME", "HyperLocal Business Engine"),
    fromAddress: optional("EMAIL_FROM_ADDRESS", "noreply@hbe.local"),
  },
} as const;
