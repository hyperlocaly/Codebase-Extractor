import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../app";

describe("GET /api/v1/notifications", () => {
  it("returns 401 when not authenticated", async () => {
    const res = await request(app).get("/api/v1/notifications");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/v1/notifications/unread-count", () => {
  it("returns 401 when not authenticated", async () => {
    const res = await request(app).get("/api/v1/notifications/unread-count");
    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/v1/notifications/read-all", () => {
  it("returns 401 when not authenticated", async () => {
    const res = await request(app).patch("/api/v1/notifications/read-all");
    expect(res.status).toBe(401);
  });
});

describe("DELETE /api/v1/notifications/:id", () => {
  it("returns 401 when not authenticated", async () => {
    const res = await request(app).delete("/api/v1/notifications/some-id");
    expect(res.status).toBe(401);
  });
});
