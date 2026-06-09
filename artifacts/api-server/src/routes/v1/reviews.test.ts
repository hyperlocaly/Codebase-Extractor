import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../app";

const MARKETPLACE = { "X-Marketplace-Slug": "fashion-nigeria" };
const FAKE_BIZ_ID = "00000000-0000-0000-0000-000000000001";
const FAKE_REVIEW_ID = "00000000-0000-0000-0000-000000000002";

describe("GET /api/v1/reviews", () => {
  it("returns 404 when marketplace header missing", async () => {
    const res = await request(app).get("/api/v1/reviews");
    expect(res.status).toBe(404);
  });

  it("returns 400 when businessId is missing (route requires it)", async () => {
    const res = await request(app).get("/api/v1/reviews").set(MARKETPLACE);
    expect(res.status).toBe(400);
  });

  it("accepts businessId query param and returns data or error", async () => {
    const res = await request(app)
      .get(`/api/v1/reviews?businessId=${FAKE_BIZ_ID}`)
      .set(MARKETPLACE);
    expect([200, 404, 500]).toContain(res.status);
  });
});

describe("GET /api/v1/reviews/summary", () => {
  it("returns 404 when marketplace header missing", async () => {
    const res = await request(app).get("/api/v1/reviews/summary");
    expect(res.status).toBe(404);
  });

  it("returns 400 when businessId is missing", async () => {
    const res = await request(app)
      .get("/api/v1/reviews/summary")
      .set(MARKETPLACE);
    expect(res.status).toBe(400);
  });
});

describe("POST /api/v1/reviews", () => {
  it("returns 401 when not authenticated", async () => {
    const res = await request(app)
      .post("/api/v1/reviews")
      .set(MARKETPLACE)
      .send({ businessId: FAKE_BIZ_ID, rating: 5, body: "Great" });
    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/v1/reviews/:id (update own review)", () => {
  it("returns 401 when not authenticated", async () => {
    const res = await request(app)
      .patch(`/api/v1/reviews/${FAKE_REVIEW_ID}`)
      .set(MARKETPLACE)
      .send({ body: "Updated review" });
    expect(res.status).toBe(401);
  });
});

describe("DELETE /api/v1/reviews/:id", () => {
  it("returns 401 when not authenticated", async () => {
    const res = await request(app)
      .delete(`/api/v1/reviews/${FAKE_REVIEW_ID}`)
      .set(MARKETPLACE);
    expect(res.status).toBe(401);
  });
});
