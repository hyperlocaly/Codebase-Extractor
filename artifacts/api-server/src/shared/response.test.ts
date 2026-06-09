import { describe, it, expect } from "vitest";
import { buildNextCursor, parsePagination } from "./pagination";

describe("parsePagination", () => {
  it("returns default limit of 20", () => {
    const { limit } = parsePagination(undefined, undefined);
    expect(limit).toBe(20);
  });

  it("caps limit at 100", () => {
    const { limit } = parsePagination("500", undefined);
    expect(limit).toBe(100);
  });

  it("enforces minimum (treats 0 as default)", () => {
    const { limit } = parsePagination("0", undefined);
    expect(limit).toBe(20);
  });

  it("accepts a custom limit within range", () => {
    const { limit } = parsePagination("50", undefined);
    expect(limit).toBe(50);
  });

  it("returns null cursor when rawCursor is undefined", () => {
    const { cursor } = parsePagination(undefined, undefined);
    expect(cursor).toBeNull();
  });
});

describe("buildNextCursor", () => {
  it("returns null when rows fewer than limit (no more pages)", () => {
    const rows = [{ id: "a", createdAt: new Date() }];
    expect(buildNextCursor(rows, 20)).toBeNull();
  });

  it("returns cursor when rows equal limit (implementation returns cursor when length >= limit)", () => {
    const rows = [
      { id: "a", createdAt: new Date("2024-01-01") },
      { id: "b", createdAt: new Date("2024-01-02") },
    ];
    // buildNextCursor returns cursor when rows.length >= limit
    // Callers are responsible for fetching limit+1 and slicing
    const cursor = buildNextCursor(rows, 2);
    expect(cursor).not.toBeNull();
  });

  it("returns cursor when rows exceed limit (extra row = next page exists)", () => {
    const limit = 2;
    const rows = [
      { id: "a", createdAt: new Date("2024-01-01") },
      { id: "b", createdAt: new Date("2024-01-02") },
      { id: "c", createdAt: new Date("2024-01-03") }, // extra row
    ];
    const cursor = buildNextCursor(rows, limit);
    expect(cursor).not.toBeNull();
    // Cursor is encoded from the LAST row (the extra row)
    const decoded = JSON.parse(Buffer.from(cursor!, "base64url").toString());
    expect(decoded.id).toBe("c");
  });

  it("returns null for empty rows", () => {
    expect(buildNextCursor([], 20)).toBeNull();
  });
});
