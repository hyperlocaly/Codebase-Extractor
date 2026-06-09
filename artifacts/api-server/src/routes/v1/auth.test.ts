import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../app";

describe("POST /api/v1/auth/register", () => {
  it("returns 400 when body is missing required fields", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({});
    expect(res.status).toBe(400);
  });

  it("returns 400 when email is invalid", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ email: "not-an-email", password: "secure123", displayName: "Test" });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/v1/auth/login", () => {
  it("returns 400 when credentials missing", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({});
    expect(res.status).toBe(400);
  });
});

describe("GET /api/v1/auth/me", () => {
  it("returns 401 when no token provided", async () => {
    const res = await request(app).get("/api/v1/auth/me");
    expect(res.status).toBe(401);
  });
});
