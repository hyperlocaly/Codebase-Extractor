/**
 * Idempotent setup for PostgreSQL extensions and search indexes.
 * Plain Node.js — no TypeScript tooling required.
 * Run via: pnpm --filter @workspace/db run setup:extensions
 */
import pg from "pg";

const { Client } = pg;

const DATABASE_URL = process.env["DATABASE_URL"];
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const client = new Client({ connectionString: DATABASE_URL });

async function setupExtensions() {
  await client.connect();
  try {
    await client.query("CREATE EXTENSION IF NOT EXISTS pg_trgm;");
    console.log("✅ pg_trgm extension ready");

    await client.query(
      "CREATE INDEX IF NOT EXISTS businesses_name_trgm_idx ON businesses USING GIN (name gin_trgm_ops);",
    );
    console.log("✅ businesses_name_trgm_idx ready");

    await client.query(
      "CREATE INDEX IF NOT EXISTS businesses_tagline_trgm_idx ON businesses USING GIN (tagline gin_trgm_ops);",
    );
    console.log("✅ businesses_tagline_trgm_idx ready");

    await client.query(
      "CREATE INDEX IF NOT EXISTS locations_name_trgm_idx ON locations USING GIN (name gin_trgm_ops);",
    );
    console.log("✅ locations_name_trgm_idx ready");

    console.log("\nSearch extension setup complete.");
  } finally {
    await client.end();
  }
}

setupExtensions().catch((err) => {
  console.error("Extension setup failed:", err);
  process.exit(1);
});
