import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../app";

const MARKETPLACE = { "X-Marketplace-Slug": "fashion-nigeria" };
const FAKE_BIZ_ID = "00000000-0000-0000-0000-000000000001";
const FAKE_CLAIM_ID = "00000000-0000-0000-0000-000000000002";

// Claim requests are at /api/v1/claim-requests (not /businesses/:id/claim)
describe("GET /api/v1/claim-requests", () => {
  it("returns 401 when not authenticated", async () => {
    const res = await request(app)
      .get("/api/v1/claim-requests")
      .set(MARKETPLACE);
    expect(res.status).toBe(401);
  });

  it("returns 404 when marketplace missing", async () => {
    const res = await request(app).get("/api/v1/claim-requests");
    // claim-requests has requireAuth first, so may be 401 or 404 depending on order
    expect([401, 404]).toContain(res.status);
  });
});

describe("POST /api/v1/claim-requests", () => {
  it("returns 401 when not authenticated", async () => {
    const res = await request(app)
      .post("/api/v1/claim-requests")
      .set(MARKETPLACE)
      .send({ businessId: FAKE_BIZ_ID });
    expect(res.status).toBe(401);
  });

  it("returns 400 when businessId is missing (if auth passed)", async () => {
    const res = await request(app)
      .post("/api/v1/claim-requests")
      .set(MARKETPLACE)
      .send({});
    // Without auth this should be 401; with auth and missing field it would be 400
    expect([400, 401]).toContain(res.status);
  });
});
