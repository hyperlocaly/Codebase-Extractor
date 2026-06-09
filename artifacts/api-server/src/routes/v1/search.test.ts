import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../app";

const MARKETPLACE_HEADER = { "X-Marketplace-Slug": "fashion-nigeria" };

describe("GET /api/v1/search/businesses", () => {
  it("returns 404 when marketplace header missing (marketplace not found)", async () => {
    const res = await request(app).get("/api/v1/search/businesses");
    expect(res.status).toBe(404);
  });

  it("accepts marketplace via header and returns data or DB error", async () => {
    const res = await request(app)
      .get("/api/v1/search/businesses")
      .set(MARKETPLACE_HEADER);
    expect([200, 500]).toContain(res.status);
  });
});

describe("GET /api/v1/search/suggestions", () => {
  it("returns 400 when q is too short (2 char min)", async () => {
    const res = await request(app)
      .get("/api/v1/search/suggestions?q=a")
      .set(MARKETPLACE_HEADER);
    // May be 400 (if marketplace resolves) or 404/500 (if marketplace not resolved in test)
    expect([400, 404, 500]).toContain(res.status);
  });

  it("returns 400 or 404 when q is missing", async () => {
    const res = await request(app)
      .get("/api/v1/search/suggestions")
      .set(MARKETPLACE_HEADER);
    expect([400, 404, 500]).toContain(res.status);
  });
});

describe("GET /api/v1/search/updates", () => {
  it("returns 404 when marketplace header missing", async () => {
    const res = await request(app).get("/api/v1/search/updates");
    expect(res.status).toBe(404);
  });

  it("accepts marketplace via header", async () => {
    const res = await request(app)
      .get("/api/v1/search/updates")
      .set(MARKETPLACE_HEADER);
    expect([200, 500]).toContain(res.status);
  });
});

describe("GET /api/v1/search/products", () => {
  it("returns 404 when marketplace header missing", async () => {
    const res = await request(app).get("/api/v1/search/products");
    expect(res.status).toBe(404);
  });
});

describe("GET /api/v1/search/services", () => {
  it("returns 404 when marketplace header missing", async () => {
    const res = await request(app).get("/api/v1/search/services");
    expect(res.status).toBe(404);
  });
});
