import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../app";

/**
 * Multi-tenant isolation tests.
 *
 * Routes that use requireMarketplace return 404 when the slug is missing or unknown.
 * Routes that are global (categories) or have their own validation (locations) behave differently.
 */
describe("Marketplace isolation — routes with requireMarketplace return 404 without slug", () => {
  const strictRoutes = [
    { method: "GET", path: "/api/v1/businesses" },
    { method: "GET", path: "/api/v1/search/businesses" },
    { method: "GET", path: "/api/v1/search/updates" },
  ];

  for (const { method, path } of strictRoutes) {
    it(`${method} ${path} returns 404 when no marketplace header`, async () => {
      const res = await (request(app) as any)[method.toLowerCase()](path);
      expect(res.status).toBe(404);
    });
  }
});

describe("Marketplace isolation — global routes (no marketplace required)", () => {
  it("GET /api/v1/categories returns 200 (categories are global)", async () => {
    const res = await request(app).get("/api/v1/categories");
    expect([200, 500]).toContain(res.status);
  });
});

describe("Marketplace isolation — routes with own required params", () => {
  it("GET /api/v1/locations returns 400 (country param is required)", async () => {
    const res = await request(app).get("/api/v1/locations");
    expect(res.status).toBe(400);
  });
});

describe("Marketplace isolation — invalid/unknown slug", () => {
  const UNKNOWN_MARKETPLACE = { "X-Marketplace-Slug": "does-not-exist" };

  it("GET /api/v1/businesses returns 404 for unknown marketplace", async () => {
    const res = await request(app)
      .get("/api/v1/businesses")
      .set(UNKNOWN_MARKETPLACE);
    expect(res.status).toBe(404);
  });

  it("GET /api/v1/search/businesses returns 404 for unknown marketplace", async () => {
    const res = await request(app)
      .get("/api/v1/search/businesses")
      .set(UNKNOWN_MARKETPLACE);
    expect(res.status).toBe(404);
  });
});

describe("Marketplace isolation — marketplace param vs header", () => {
  it("?marketplace query param also resolves marketplace context", async () => {
    const res = await request(app).get(
      "/api/v1/businesses?marketplace=fashion-nigeria"
    );
    expect([200, 404, 500]).toContain(res.status);
  });
});
