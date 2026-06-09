import { pool } from "@workspace/db";

export async function withDb<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } finally {
    await pool.end();
  }
}

export function log(msg: string, data?: Record<string, unknown>): void {
  const now = new Date().toISOString();
  if (data) {
    console.log(`[${now}] ${msg}`, JSON.stringify(data));
  } else {
    console.log(`[${now}] ${msg}`);
  }
}

export function logDone(seedName: string, inserted: number, skipped: number = 0): void {
  log(`✓ ${seedName}: ${inserted} inserted, ${skipped} skipped`);
}
