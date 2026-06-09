---
name: Sprint 9 notification & saved-items quirks
description: Type/API constraints discovered during Sprint 9 implementation that deviate from the usual pattern.
---

## markNotificationRead / deleteNotification — no params field

Both mutations take only `{ id: string }` — no `params` object. The notification endpoints have no query params (no marketplace required — user-scoped only).

```typescript
markRead.mutateAsync({ id: notifId });           // correct
deleteNotif.mutateAsync({ id: notifId });         // correct
markRead.mutateAsync({ id, params: {} });         // TypeScript error: params not in type
```

**Why:** The `/notifications` routes use `requireAuth` only, no `requireMarketplace` middleware.

**How to apply:** Any future notification mutation call — omit `params`.

---

## listNotifications — returns Promise<void>

The OpenAPI spec for `GET /v1/notifications` has no response content schema for the 200 case (just `description: Paginated list`). Orval generates `Promise<void>`. Access data with `as any`:

```typescript
const notifs = ((data as any)?.data ?? []) as NotifRecord[];
const pagination = (data as any)?.pagination as { hasMore: boolean; nextCursor: string | null } | undefined;
```

**Why:** Missing schema in openapi.yaml — would require adding a Notifications response schema to fix cleanly.

---

## Saved items — no entity enrichment

`GET /v1/saved-items` returns raw DB rows: `{ id, userId, marketplaceId, entityType, entityId, createdAt }`. No business name, product name, or any linked entity data. To display entity details, a second fetch per item is required (expensive) or the backend needs an enriched endpoint.

**Why:** Backend just does `db.select().from(savedItemsTable)` with no joins.

**How to apply:** SavedItemsPage shows entityType badge + UUID. For business items, "Browse Directory" CTA is the only practical link since `/business/:slug` requires a slug (not ID).

---

## claimStatus values

Business `claimStatus` is nullable (null = never claimed). Possible values:
- `null` — unclaimed (show Claim Business button)
- `'pending'` — claim under review (don't show button)
- `'claimed'` — ownership confirmed (don't show button)
- `'verified'` — verification status (separate from claim)

Claim button condition: `!business.claimStatus` (only when null).

---

## Cursor-based pagination with item accumulation — canonical pattern

For any list page that needs "Load more" with cursor-based pagination, use this pattern (see SavedItemsPage, NotificationsPage, ReviewsSection as reference):

```typescript
const [cursor, setCursor] = useState<string | undefined>(undefined);
const [allItems, setAllItems] = useState<Item[]>([]);
const [hasMore, setHasMore] = useState(false);
const [nextCursor, setNextCursor] = useState<string | null>(null);
const isFirstPageRef = useRef(true);   // tracks replace vs. append

// Query includes cursor in params
const queryParams = { ...baseParams, ...(cursor ? { cursor } : {}) };

useEffect(() => {
  if (!data) return;
  const page = ((data as any)?.data ?? []) as Item[];
  const pagination = (data as any)?.pagination;
  if (isFirstPageRef.current) {
    setAllItems(page);
  } else {
    setAllItems(prev => {
      const ids = new Set(prev.map(i => i.id));
      return [...prev, ...page.filter(i => !ids.has(i.id))];
    });
  }
  setHasMore(pagination?.hasMore ?? false);
  setNextCursor(pagination?.nextCursor ?? null);
}, [data]);

function handleLoadMore() {
  if (nextCursor) { isFirstPageRef.current = false; setCursor(nextCursor); }
}

// Reset accumulation on filter change
function switchFilter(f: Filter) {
  isFirstPageRef.current = true;
  setCursor(undefined);
  setAllItems([]);
  setFilter(f);
}
```

**Why:** React Query caches per queryKey (which includes cursor). Without local accumulation, switching cursor discards old pages. `isFirstPageRef` (a ref, not state) avoids triggering re-renders while tracking replace vs. append intent.

---

## Saved-items queryKey invalidation — must use base path

Orval queryKey includes all params: `['/api/v1/saved-items', { marketplace, limit, cursor }]`. To invalidate ALL saved-items queries (e.g., after save/unsave), use just the base path string so React Query matches by prefix:

```typescript
queryClient.invalidateQueries({ queryKey: ['/api/v1/saved-items'] });
```

Using `getListSavedItemsQueryKey({ marketplace })` only matches queries with exactly `{ marketplace }` params — it won't bust queries that also have `limit` or `cursor`.

**How to apply:** Same pattern applies to any Orval-generated hook where you want to bust all variants — use the literal path string as the prefix key.

---

## Review summary invalidation after review submit

After `createReview` succeeds, invalidate the summary query explicitly — the review list refetch doesn't cascade to the summary:

```typescript
queryClient.invalidateQueries({
  queryKey: getGetReviewSummaryQueryKey({ businessId, marketplace: MARKETPLACE_SLUG }),
});
```

Note the double "Get": `getGetReviewSummaryQueryKey` (Orval names it from `getReviewSummary` → `getGetReviewSummaryQueryKey`).

---

## pg_trgm required for search

`CREATE EXTENSION IF NOT EXISTS pg_trgm;` must be run in the DB or all search requests return 500. This is a one-time setup step — not managed by Drizzle migrations.
