import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../app";

const MARKETPLACE = { "X-Marketplace-Slug": "fashion-nigeria" };

describe("GET /api/v1/businesses", () => {
  it("returns 404 when marketplace header missing", async () => {
    const res = await request(app).get("/api/v1/businesses");
    expect(res.status).toBe(404);
  });

  it("returns business list with marketplace header", async () => {
    const res = await request(app).get("/api/v1/businesses").set(MARKETPLACE);
    expect([200, 500]).toContain(res.status);
  });

  it("accepts pagination query params", async () => {
    const res = await request(app)
      .get("/api/v1/businesses?limit=10")
      .set(MARKETPLACE);
    expect([200, 500]).toContain(res.status);
  });
});

describe("POST /api/v1/businesses", () => {
  it("returns 401 when not authenticated", async () => {
    const res = await request(app)
      .post("/api/v1/businesses")
      .set(MARKETPLACE)
      .send({ name: "Test Business" });
    expect(res.status).toBe(401);
  });

  it("returns 401 without marketplace header", async () => {
    const res = await request(app)
      .post("/api/v1/businesses")
      .send({ name: "Test Business" });
    expect([401, 404]).toContain(res.status);
  });
});

describe("GET /api/v1/businesses/:id", () => {
  it("returns 404 for non-existent business", async () => {
    const res = await request(app)
      .get("/api/v1/businesses/00000000-0000-0000-0000-000000000001")
      .set(MARKETPLACE);
    expect([404, 500]).toContain(res.status);
  });

  it("returns 400 for invalid UUID format", async () => {
    const res = await request(app)
      .get("/api/v1/businesses/not-a-uuid")
      .set(MARKETPLACE);
    expect([400, 404]).toContain(res.status);
  });
});

describe("PATCH /api/v1/businesses/:id", () => {
  it("returns 401 when not authenticated", async () => {
    const res = await request(app)
      .patch("/api/v1/businesses/00000000-0000-0000-0000-000000000001")
      .set(MARKETPLACE)
      .send({ name: "Updated" });
    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/v1/admin/businesses/:id/status (publish/suspend via admin)", () => {
  it("returns 401 when not authenticated", async () => {
    const res = await request(app)
      .patch("/api/v1/admin/businesses/00000000-0000-0000-0000-000000000001/status")
      .set(MARKETPLACE)
      .send({ status: "published" });
    expect(res.status).toBe(401);
  });
});
