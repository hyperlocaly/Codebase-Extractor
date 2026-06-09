export const ENTITY_TYPES = [
  "business",
  "product",
  "service",
  "portfolio",
  "portfolio_item",
  "business_update",
  "review",
  "user",
  "media",
] as const;

export type EntityType = (typeof ENTITY_TYPES)[number];
