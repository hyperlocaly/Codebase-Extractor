/**
 * Lightweight test helpers — no real DB connection required.
 * Tests mock the DB and assert route behavior.
 */
import app from "../app";
import type { Express } from "express";

export function getApp(): Express {
  return app;
}

export function makeMarketplaceHeaders(slug = "fashion-nigeria") {
  return { "X-Marketplace-Slug": slug };
}

export function makeAuthHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}
