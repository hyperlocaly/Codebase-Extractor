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
