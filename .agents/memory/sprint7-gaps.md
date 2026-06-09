---
name: Sprint 7 gap closure decisions
description: Key decisions and architecture from closing the Sprint 7 audit gaps
---

## imageUrl on products/services
- Added `imageUrl text` column to `productsTable` and `servicesTable` in `lib/db/src/schema/inventory.ts`.
- Added `imageUrl` + `categoryId` to `ProductSummary`, `ServiceSummary`, `ProductInput`, `ServiceInput` in OpenAPI spec.
- Frontend image upload: file picker → `URL.createObjectURL` for local preview → on save, calls presign → stores `storageKey` as imageUrl. Also supports URL paste.
- Cards show image only if `imageUrl` starts with "http" (storageKey is not a displayable URL with placeholder storage).

## Status persistence fix
- Products and services backend had hardcoded `status: "active"` on insert, overriding the schema value.
- Fix: removed hardcode; `ProductSchema`/`ServiceSchema` now include `status: z.enum(["active","draft","archived"]).default("draft")`.

## Shared assertBusinessOwner
- Location: `artifacts/api-server/src/shared/business-owner.ts`
- Shared across `products.ts`, `services.ts`, `media.ts` — eliminates duplication.

## Dashboard search/filter
- Client-side filtering in `ProductsPage` and `ServicesPage` — search by name/description, filter by active/draft status.
- Queries use `status: all` to fetch all records, then filter client-side.

## Error states in consumer profile
- `ProductList` and `ServiceList` now accept `isError?: boolean` and `onRetry?: () => void` props.
- `BusinessTabs` forwards these props; `BusinessProfilePage` passes `isError` and `refetch` from `useListProducts`/`useListServices`.

## Codegen / typing
- `UseQueryOptions` requires `queryKey` when passed via `{ query: {...} }` options to generated hooks. Pass only `enabled` if using the options shorthand; otherwise call the hook with no options arg.

**Why:** Documented so Sprint 8 work (portfolio, updates, branches) follows these patterns consistently.
