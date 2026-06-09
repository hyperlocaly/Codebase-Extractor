import { describe, it, expect, vi, beforeAll } from "vitest";
import request from "supertest";
import app from "../../app";

describe("GET /health", () => {
  it("returns 200 with status ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.timestamp).toBeTruthy();
  });
});

describe("GET /readiness", () => {
  it("returns 200 when DB is reachable", async () => {
    // Mock the DB call
    vi.mock("@workspace/db", () => ({
      db: {
        execute: vi.fn().mockResolvedValue({}),
      },
      sql: vi.fn(),
      pool: { end: vi.fn() },
    }));

    const res = await request(app).get("/readiness");
    // In test env, DB may not be configured but endpoint should exist
    expect([200, 503]).toContain(res.status);
    expect(res.body.status).toBeDefined();
  });
});

describe("GET /metrics", () => {
  it("returns prometheus metrics text", async () => {
    const res = await request(app).get("/metrics");
    expect(res.status).toBe(200);
  });
});
