# HyperLocal Business Engine

A multi-tenant business directory and marketplace platform. Currently scoped to the "Fashion Nigeria" marketplace (`slug: fashion-nigeria`, country: NG, currency: NGN).

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port from workflow)
- `pnpm --filter @workspace/mockup-sandbox run dev` — run the frontend (Vite)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run typecheck:libs` — build/typecheck lib packages only (domain-constants, db, api-zod, api-client-react)
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate React Query hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes to dev DB (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (already provisioned)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (artifacts/api-server)
- Frontend: React 19 + Vite + React Router v6 + Tailwind CSS v4 + Shadcn UI (artifacts/mockup-sandbox)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — Single source of truth for all API contracts (4347 lines, 99 ops)
- `lib/db/src/schema/` — Drizzle ORM schema (20+ tables across foundation, users, businesses, categories, etc.)
- `lib/domain-constants/src/` — Shared enums: role codes, status values, event types
- `lib/api-client-react/src/generated/` — Generated React Query hooks (from codegen)
- `lib/api-zod/src/generated/` — Generated Zod schemas (from codegen)
- `artifacts/api-server/src/routes/v1/` — All backend route handlers
- `artifacts/api-server/src/middleware/` — auth, RBAC, error handler, marketplace context
- `artifacts/mockup-sandbox/src/` — Frontend React app
- `artifacts/mockup-sandbox/src/routes/index.tsx` — Router definition
- `artifacts/mockup-sandbox/src/providers/` — MarketplaceProvider, AuthProvider, DashboardProvider, QueryProvider
- `artifacts/mockup-sandbox/src/pages/` — All pages (auth, consumer, dashboard, admin)
- `scripts/src/seeds/` — Seed scripts for countries, currencies, categories, roles, templates

## Architecture decisions

- **Multi-tenant via X-Marketplace-Slug header** — Every API request carries a marketplace slug; middleware resolves it to a marketplace record and attaches it to `req.marketplace`. Frontend injects it via `MarketplaceProvider`.
- **JWT auth (custom, not Clerk)** — Uses `jose` for JWT signing/verification. Auth middleware attaches `req.user`. No external auth provider.
- **OpenAPI-first** — All API contracts live in `openapi.yaml`. Codegen (`orval`) produces typed React Query hooks and Zod schemas. Never write hooks manually.
- **Outbox pattern for events** — Domain events (e.g. `UserRegistered`) are written to the outbox table in the same transaction, then published asynchronously by a worker.
- **Engagement tracking** — Fire-and-forget `POST /api/v1/engagement/track` for profile_view, whatsapp_click, etc.

## Product

- **Consumer**: Browse businesses by category/location, search, view business profiles (hours, contacts, products, services, portfolio, reviews), save items, notifications.
- **Business Owner**: Onboarding wizard, dashboard to manage profile, hours, contacts, products, services, portfolio, updates, branches, service areas, verification status.
- **Admin**: Business status management, claim review, review moderation, analytics.

## Sprint Status

- **Sprint 1–5**: Backend foundation complete. All 99 API endpoints implemented.
- **Sprint 6**: Dashboard foundation — DashboardPage, OnboardingPage, ProfilePage, HoursPage, ContactsPage ✅
- **Sprint 7**: ProductsPage and ServicesPage routes exist; implementation status needs verification.
- **Sprint 8+**: Portfolio, Updates, Branches, Service Areas, Verification — all placeholder routes.
- **Sprint 9+**: Saved Items, Notifications — placeholder routes.
- **Sprint 10+**: Admin dashboard — all placeholder routes.

## Backend Gaps (known from FRONTEND.md)

1. `pg_trgm` extension not installed — search with `?q=` returns 500
2. No seeded admin user — can't test admin screens
3. `UserRegistered` event not published — email verification email never sent
4. Media upload URL is a placeholder — wire real object storage before media UI ships
5. No `forgot-password` / `reset-password` endpoints
6. No admin-wide review list endpoint

## User preferences

- Sprint-based implementation with validation before each phase
- Audit first, implement second — no code before pre-flight validation
- Typecheck + build must pass before a sprint is considered complete

## Gotchas

- **Always run `pnpm run typecheck:libs` before leaf package typecheck** — stale lib declarations cause phantom type errors.
- **Run `pnpm --filter @workspace/api-spec run codegen` after any OpenAPI spec change** — never write hooks manually.
- **Field is `contactType`, not `type`** on business contacts.
- **Products use `price` + `currencyId`**, not `pricingType` / `priceAmount`.
- **Search requires `pg_trgm`** — `CREATE EXTENSION IF NOT EXISTS pg_trgm;` must be run in the DB.
- **Do not call `pnpm run dev` at workspace root** — use workflows or `pnpm --filter`.

## Pointers

- See `FRONTEND.md` for detailed screen specs, component architecture, and feature priority matrix.
- See the `pnpm-workspace` skill for workspace structure and TypeScript setup.
