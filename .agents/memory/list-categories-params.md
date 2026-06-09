---
name: ListCategoriesParams shape
description: The generated ListCategoriesParams type only accepts parent, not marketplace
---

`ListCategoriesParams` (generated from OpenAPI) has only one field:
```ts
export type ListCategoriesParams = {
  parent?: string; // parent category slug; omit for root categories
};
```

**Why:** Categories endpoint does not require a marketplace filter — categories are global.
**How to apply:** Call `useListCategories()` with no args for root categories, or `useListCategories({ parent: 'slug' })` for children. Do NOT pass `{ marketplace: MARKETPLACE_SLUG }` — it will fail TS2353.
