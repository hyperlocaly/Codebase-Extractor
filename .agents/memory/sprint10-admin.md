---
name: Sprint 10 admin pages
description: Admin pages built, OpenAPI schemas fixed, security hardened — decisions worth keeping consistent.
---

## Admin pages built
- `AdminDashboardPage` — analytics summary stats + quick-nav cards to /admin/businesses, /admin/claims, /admin/reviews, /admin/analytics
- `AdminBusinessesPage` — table with status filter + search (debounced), status-change dropdown, AlertDialog confirm, `useAdminUpdateBusinessStatus` mutation, invalidates `getAdminListBusinessesQueryKey` on success
- `AdminClaimsPage` — list with status filter, approve/reject Dialog with optional adminNote Textarea, `useAdminResolveClaim` mutation, invalidates `getAdminListClaimRequestsQueryKey` on success
- `AdminAnalyticsPage` — summary stats cards + search insights (top queries + zero-result queries) with period dropdown (7/30/90 days), independent loading states per section

## Security fixes applied
- `templates.ts` — all 11 write routes (POST/PATCH/DELETE/clone/activate/set-marketplace-default) now require `requirePermission("admin:manage")` after `requireAuth`. The import is from `../../middleware/rbac`.
- `verification.ts` — GET `/` (list verifications for a business) now requires `requireAuth` before `requireMarketplace`. Previously unauthenticated.

## OpenAPI response schemas added
Six admin endpoints previously had no `content` in their 200 response (Orval generated `Promise<void>`). Added proper inline schemas for:
- `adminListBusinesses`, `adminUpdateBusinessStatus` — business objects with pagination
- `adminListClaimRequests`, `adminResolveClaim` — claim objects with nested business+user
- `adminAnalyticsSummary` — marketplace/businesses/reviews/search/engagement breakdown
- `adminAnalyticsSearch` — topQueries/zeroResultQueries arrays with periodDays

**Why:** Orval's code-gen treats a 200 with no `content` as `Promise<void>`, making `TData = never` in consumers — the hook data is always undefined.

## Other frontend fixes in this session
- `CategoryPage.tsx` — breadcrumb parent link condition changed from `!isRoot` (depth >= 0 bug) to `category.depth === 1` (correct)
- `DashboardPage.tsx` — added `isError: bizError, refetch: refetchBiz` destructuring + inline error banner with retry
- `HomePage.tsx` — "View all businesses →" button added below BusinessGrid; `Link` imported from react-router-dom
- `BusinessProfilePage.tsx` — after successful claim, calls `queryClient.invalidateQueries({ queryKey: getGetBusinessQueryKey(business.slug, { marketplace: MARKETPLACE_SLUG }) })` so stale claimStatus is cleared
