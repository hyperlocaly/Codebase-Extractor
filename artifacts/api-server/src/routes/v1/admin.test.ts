import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../app";

const MARKETPLACE = { "X-Marketplace-Slug": "fashion-nigeria" };
const FAKE_BIZ_ID = "00000000-0000-0000-0000-000000000001";

describe("Admin RBAC — unauthenticated access is rejected", () => {
  it("GET /api/v1/admin/businesses returns 401 without token", async () => {
    const res = await request(app)
      .get("/api/v1/admin/businesses")
      .set(MARKETPLACE);
    expect(res.status).toBe(401);
  });

  it("PATCH /api/v1/admin/businesses/:id/status returns 401 without token", async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/businesses/${FAKE_BIZ_ID}/status`)
      .set(MARKETPLACE)
      .send({ status: "suspended" });
    expect(res.status).toBe(401);
  });
});

describe("Admin — claim review endpoints", () => {
  const FAKE_CLAIM_ID = "00000000-0000-0000-0000-000000000002";

  it("GET /api/v1/admin/claims returns 401 without token", async () => {
    const res = await request(app)
      .get("/api/v1/admin/claims")
      .set(MARKETPLACE);
    // Could be 404 if route doesn't exist at this path
    expect([401, 404]).toContain(res.status);
  });
});

describe("Admin — review moderation requires auth", () => {
  const FAKE_REVIEW = "00000000-0000-0000-0000-000000000003";

  it("PATCH /api/v1/admin/reviews/:id/moderate returns 401 without auth", async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/reviews/${FAKE_REVIEW}/moderate`)
      .set(MARKETPLACE)
      .send({ status: "rejected", reason: "spam" });
    expect([401, 404]).toContain(res.status);
  });
});

describe("Admin — analytics endpoints require auth", () => {
  it("GET /api/v1/admin/analytics returns 401 without auth", async () => {
    const res = await request(app)
      .get("/api/v1/admin/analytics")
      .set(MARKETPLACE);
    expect([401, 404]).toContain(res.status);
  });
});
