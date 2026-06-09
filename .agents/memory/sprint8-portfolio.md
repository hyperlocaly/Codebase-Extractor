---
name: Sprint 8 Portfolio Implementation
description: What was added/fixed in Sprint 8 for the portfolio management feature.
---

## Key decisions

**DB schema additions (lib/db/src/schema/portfolio.ts):**
- `portfoliosTable`: added `featuredImage` (text, nullable)
- `portfolioItemsTable`: added `description` (text), `externalUrl` (text), `updatedAt` (timestamp)

**Backend defects fixed (artifacts/api-server/src/routes/v1/portfolio.ts):**
- Replaced local `assertOwner` duplicate with imported `assertBusinessOwner` from shared helper
- Added `PATCH /:id/items/:itemId` endpoint (was missing entirely)
- Added `status` query param to GET endpoint — owners can pass `status=all` or `status=draft` to see their drafts; public always gets `published` only

**OpenAPI fixes (lib/api-spec/openapi.yaml):**
- Added named schemas: `Portfolio`, `PortfolioItem`, `PortfolioCollection` (allOf Portfolio + items array)
- Fixed all POST/PATCH response bodies — were returning `Promise<void>`; now return typed objects
- Added `featuredImage`, `status` to portfolio create/update
- Added `description`, `externalUrl` to item create/update
- Added PATCH item endpoint

**Frontend (artifacts/mockup-sandbox/src):**
- Created `pages/dashboard/PortfolioPage.tsx` — full collection manager with search/filter, collection form sheet, items manager sheet, delete dialogs, presign upload, drag reorder
- Enhanced `components/business-profile/PortfolioGrid.tsx` — image modal with keyboard nav, featured collection block (hero + thumbnail strip), error state with retry
- Updated `BusinessTabs.tsx` and `BusinessProfilePage.tsx` to use typed `PortfolioCollection[]` and pass error/retry props

**Why:**
- Inline assertOwner was a maintenance risk after shared helper was created in Sprint 7
- void return types prevented cache invalidation and optimistic UI from working
- Missing PATCH item endpoint meant captions/descriptions couldn't be updated without delete+recreate
