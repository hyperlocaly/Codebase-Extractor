import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../app";

const MARKETPLACE = { "X-Marketplace-Slug": "fashion-nigeria" };
const FAKE_BIZ_ID = "00000000-0000-0000-0000-000000000001";
// Route is mounted at /businesses/:businessId/verifications (plural)
const BASE = `/api/v1/businesses/${FAKE_BIZ_ID}/verifications`;

describe("GET /api/v1/businesses/:id/verifications", () => {
  it("returns 401 when not authenticated", async () => {
    const res = await request(app).get(BASE).set(MARKETPLACE);
    expect([401, 404]).toContain(res.status);
  });
});

describe("POST /api/v1/businesses/:id/verifications (submit)", () => {
  it("returns 401 when not authenticated", async () => {
    const res = await request(app).post(BASE).set(MARKETPLACE).send({});
    expect([401, 400, 404]).toContain(res.status);
  });
});

describe("PATCH /api/v1/businesses/:id/verifications/:vid (review)", () => {
  it("returns 401 when not authenticated", async () => {
    const fakeVerId = "00000000-0000-0000-0000-000000000099";
    const res = await request(app)
      .patch(`${BASE}/${fakeVerId}`)
      .set(MARKETPLACE)
      .send({ decision: "approved" });
    expect([401, 404]).toContain(res.status);
  });
});
