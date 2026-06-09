---
name: Remaining backend gaps
description: Known backend gaps that still need implementation; frontend is unblocked but these features are incomplete.
---

As of Sprint 7–10 completion pass (June 2026), these backend gaps remain:

1. **UserRegistered event not published** — The outbox pattern is implemented but the `UserRegistered` event is never inserted into the outbox during registration. Email verification emails are never sent. Frontend shows the "email verification required" banner but the link never arrives.

2. **Media upload URL is a placeholder** — `POST /api/v1/businesses/:id/media/presign` returns a placeholder storageKey. Real object storage (S3/R2/GCS) must be wired before the image upload UI is useful in production.

3. **No forgot-password / reset-password endpoints** — The auth flow has register and login but no password recovery. The frontend has no forgot-password page yet either.

4. **No admin-wide review list endpoint** — There is no `GET /api/v1/admin/reviews` that lists reviews across all businesses. AdminReviewsPage works with per-business review moderation only.

**Already fixed (not gaps anymore):**
- `pg_trgm` — installed via `CREATE EXTENSION IF NOT EXISTS pg_trgm;` ✅
- Admin user seeded — `admin@fashion-nigeria.com` / `Admin1234!` with `marketplace_admin` role ✅
- `admin:manage` permission — templates routes now use `marketplace:configure` (which IS seeded) ✅
- Saved items entity enrichment — backend now batch-queries and returns entityName/entitySlug/businessId ✅
