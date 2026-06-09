---
name: Orval queryKey required in query options
description: Orval-generated React Query hooks require queryKey alongside enabled in the query options object.
---

When passing a second argument to Orval-generated hooks (e.g. `useListReviews(params, { query: { enabled: ... } })`), the `query` type is `UseQueryOptions<...>` — not `Partial<UseQueryOptions<...>>` — so `queryKey` is required.

**Why:** The Orval config in this project generates strict `UseQueryOptions` (not the `Partial` variant), so omitting `queryKey` causes TS2741.

**How to apply:** Always import the matching `getXxxQueryKey` helper and pass it alongside `enabled`:
```ts
import { getListReviewsQueryKey } from '@workspace/api-client-react';
// ...
const params = { businessId, marketplace: MARKETPLACE_SLUG, ... };
useListReviews(params, {
  query: { enabled: !!businessId, queryKey: getListReviewsQueryKey(params) },
});
```
Every generated hook has a corresponding `getXxxQueryKey` export.
