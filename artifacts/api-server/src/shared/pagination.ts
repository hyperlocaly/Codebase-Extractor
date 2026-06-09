import { ValidationError } from "./errors";

export interface CursorPayload {
  createdAt: string;
  id: string;
}

export interface PaginationParams {
  limit: number;
  cursor: CursorPayload | null;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export function parsePagination(
  rawLimit?: string | number,
  rawCursor?: string,
): PaginationParams {
  let limit = rawLimit ? Number(rawLimit) : DEFAULT_LIMIT;
  if (isNaN(limit) || limit < 1) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  let cursor: CursorPayload | null = null;
  if (rawCursor) {
    try {
      const decoded = Buffer.from(rawCursor, "base64url").toString("utf8");
      const parsed = JSON.parse(decoded) as unknown;
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        "createdAt" in parsed &&
        "id" in parsed &&
        typeof (parsed as CursorPayload).createdAt === "string" &&
        typeof (parsed as CursorPayload).id === "string"
      ) {
        cursor = parsed as CursorPayload;
      } else {
        throw new ValidationError("Invalid cursor format");
      }
    } catch {
      throw new ValidationError("Invalid cursor");
    }
  }

  return { limit, cursor };
}

export function encodeCursor(createdAt: Date | string, id: string): string {
  const payload: CursorPayload = {
    createdAt: createdAt instanceof Date ? createdAt.toISOString() : createdAt,
    id,
  };
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export function buildNextCursor<T extends { createdAt: Date | string; id: string }>(
  rows: T[],
  limit: number,
): string | null {
  if (rows.length < limit) return null;
  const last = rows[rows.length - 1];
  if (!last) return null;
  return encodeCursor(last.createdAt, last.id);
}
