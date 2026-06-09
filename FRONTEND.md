# HyperLocal Business Engine — Frontend Build Plan

**Generated:** 2026-06-07  
**API surface:** 99 operations across 72 paths  
**Stack:** React 19 · TypeScript · Vite · React Query · React Router v6 · Tailwind CSS v4 · Shadcn UI  
**Marketplace in scope:** Fashion Nigeria (`slug: fashion-nigeria`, country: NG, currency: NGN)

---

## 1. Frontend Ready Items

All of these are backed by working API endpoints proven in the backend audit.

| Area | Status | API Operations |
|---|---|---|
| Register / Login / Logout | ✅ Ready | `authRegister`, `authLogin`, `authLogout` |
| Email verification | ✅ Ready | `authVerifyEmail` |
| User profile fetch | ✅ Ready | `authMe` |
| Marketplace context load | ✅ Ready | `getMarketplace`, `getMarketplaceLocationConfig`, `getMarketplaceCategoryConfig` |
| Category browse (root + children) | ✅ Ready | `listCategories`, `getCategory` |
| Location browse (state → LGA → town) | ✅ Ready | `listLocations`, `getLocation`, `searchLocations` |
| Business directory (paginated) | ✅ Ready | `listBusinesses` |
| Business search (by name, category, location) | ✅ Ready* | `searchBusinesses` |
| Search autocomplete suggestions | ✅ Ready* | `searchSuggestions` |
| Product search | ✅ Ready | `searchProducts` |
| Service search | ✅ Ready | `searchServices` |
| Business updates feed | ✅ Ready | `searchUpdates`, `listBusinessUpdates` |
| Business profile (public) | ✅ Ready | `getBusiness` |
| Business hours | ✅ Ready | `getBusinessHours`, `upsertBusinessHours` |
| Business contacts | ✅ Ready | `listBusinessContacts`, `createBusinessContact`, `updateBusinessContact`, `deleteBusinessContact` |
| Business branches | ✅ Ready | `listBusinessBranches`, `createBusinessBranch`, `updateBusinessBranch`, `deleteBusinessBranch` |
| Business service areas | ✅ Ready | `listBusinessServiceAreas`, `addBusinessServiceArea`, `deleteBusinessServiceArea` |
| Business create + update | ✅ Ready | `createBusiness`, `updateBusiness`, `deleteBusiness` |
| Products (CRUD) | ✅ Ready | `listProducts`, `createProduct`, `updateProduct`, `deleteProduct` |
| Services (CRUD) | ✅ Ready | `listServices`, `createService`, `updateService`, `deleteService` |
| Portfolio (CRUD + items) | ✅ Ready | `listPortfolios`, `createPortfolio`, `updatePortfolio`, `deletePortfolio`, `addPortfolioItem`, `deletePortfolioItem` |
| Business updates (CRUD) | ✅ Ready | `listBusinessUpdates`, `createBusinessUpdate`, `patchBusinessUpdate`, `deleteBusinessUpdate` |
| Media list + upload flow | ✅ Ready† | `listBusinessMedia`, `presignBusinessMediaUpload`, `attachBusinessMedia`, `deleteBusinessMedia` |
| Reviews (read + submit) | ✅ Ready | `listReviews`, `getReviewSummary`, `createReview`, `updateReview`, `deleteReview` |
| Saved items | ✅ Ready | `listSavedItems`, `saveItem`, `removeSavedItem` |
| Engagement tracking | ✅ Ready | `trackEngagementEvent` |
| Claim requests (submit + list) | ✅ Ready | `createClaimRequest`, `listClaimRequests` |
| Notifications | ✅ Ready | `listNotifications`, `unreadNotificationCount`, `markNotificationRead`, `markAllNotificationsRead`, `deleteNotification` |
| Verifications (view types) | ✅ Ready | `getVerificationTypes`, `listBusinessVerifications` |
| Admin: business management | ✅ Ready | `adminListBusinesses`, `adminUpdateBusinessStatus` |
| Admin: claim review | ✅ Ready | `adminListClaimRequests`, `adminResolveClaim` |
| Admin: review moderation | ✅ Ready | `adminModerateReview` |
| Admin: analytics summary | ✅ Ready | `adminAnalyticsSummary`, `adminAnalyticsSearch` |

*Search requires `CREATE EXTENSION IF NOT EXISTS pg_trgm` — one SQL command, see Backend Gaps.  
†Media upload URL is a stub in dev; wire real object storage before going live.

---

## 2. Backend Gaps (Real Blockers)

| # | Gap | Blocks | Fix |
|---|---|---|---|
| 1 | **`pg_trgm` not installed** | All search with `?q=` returns HTTP 500 | `CREATE EXTENSION IF NOT EXISTS pg_trgm;` in the DB |
| 2 | **No seeded admin user** | Cannot test any admin screen end-to-end | Seed one user with `marketplace_admin` role |
| 3 | **`UserRegistered` event not published** | Email verification email never sent | Add `publishEvent` inside the auth register transaction |
| 4 | **Media upload URL is a placeholder** | Uploading images produces no actual file | Wire S3/GCS/R2 presigned URL before media UI ships |
| 5 | **No `forgot-password` / `reset-password` endpoints** | Password reset UI cannot be built | Add 2 routes to auth router + spec |
| 6 | **No admin-wide review list endpoint** | Admin review moderation requires a businessId input | Add `GET /admin/reviews?marketplace=` to spec + router |

---

## 3. Source Directory Architecture

```
artifacts/mockup-sandbox/src/
├── main.tsx                          # Entry — wraps with providers
├── App.tsx                           # Root router
├── index.css                         # Tailwind directives + CSS vars
│
├── providers/
│   ├── MarketplaceProvider.tsx       # Reads marketplace slug, fetches context
│   ├── AuthProvider.tsx              # JWT storage, user state, logout
│   └── QueryProvider.tsx            # React Query client config
│
├── layouts/
│   ├── RootLayout.tsx               # Navbar + footer wrapper (consumer)
│   ├── DashboardLayout.tsx          # Sidebar + content (business owner)
│   ├── AdminLayout.tsx              # Admin sidebar + content
│   └── AuthLayout.tsx               # Centered card layout (auth pages)
│
├── routes/
│   ├── index.tsx                    # createBrowserRouter root
│   ├── consumer.routes.tsx
│   ├── owner.routes.tsx
│   ├── admin.routes.tsx
│   └── guards/
│       ├── RequireAuth.tsx          # Redirects unauthenticated users
│       └── RequireRole.tsx          # RBAC role guard
│
├── pages/
│   ├── auth/
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   └── VerifyEmailPage.tsx
│   ├── consumer/
│   │   ├── HomePage.tsx             # Hero + search + featured
│   │   ├── DirectoryPage.tsx        # Business list + filters
│   │   ├── SearchPage.tsx           # Full search results
│   │   ├── BusinessProfilePage.tsx  # Full public business view
│   │   ├── CategoryPage.tsx         # Category drill-down
│   │   ├── SavedItemsPage.tsx
│   │   └── NotificationsPage.tsx
│   ├── owner/
│   │   ├── DashboardPage.tsx        # Overview stats
│   │   ├── OnboardingPage.tsx       # Create first business wizard
│   │   ├── BusinessSettingsPage.tsx # Edit profile
│   │   ├── ProductsPage.tsx
│   │   ├── ServicesPage.tsx
│   │   ├── PortfolioPage.tsx
│   │   ├── UpdatesPage.tsx          # News/offers/events
│   │   ├── HoursPage.tsx
│   │   ├── ContactsPage.tsx
│   │   ├── BranchesPage.tsx
│   │   ├── ServiceAreasPage.tsx
│   │   └── VerificationPage.tsx
│   └── admin/
│       ├── AdminDashboardPage.tsx
│       ├── BusinessesPage.tsx
│       ├── ClaimsPage.tsx
│       ├── ReviewsPage.tsx
│       └── AnalyticsPage.tsx
│
├── features/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   └── useAuth.ts
│   ├── search/
│   │   ├── SearchBar.tsx            # Autocomplete input
│   │   ├── SearchFilters.tsx        # Category + location pills
│   │   ├── SearchResults.tsx
│   │   └── useSearch.ts
│   ├── business/
│   │   ├── BusinessCard.tsx         # Directory card
│   │   ├── BusinessGrid.tsx
│   │   ├── BusinessProfile.tsx      # Full public profile
│   │   ├── BusinessForm.tsx         # Create / edit form
│   │   ├── HoursEditor.tsx          # 7-day grid editor
│   │   ├── ContactEditor.tsx
│   │   ├── BranchEditor.tsx
│   │   ├── ServiceAreaPicker.tsx
│   │   └── MediaUploader.tsx
│   ├── products/
│   │   ├── ProductCard.tsx
│   │   ├── ProductForm.tsx
│   │   └── ProductList.tsx
│   ├── services/
│   │   ├── ServiceCard.tsx
│   │   ├── ServiceForm.tsx
│   │   └── ServiceList.tsx
│   ├── portfolio/
│   │   ├── PortfolioGrid.tsx
│   │   ├── PortfolioForm.tsx
│   │   └── PortfolioItemUploader.tsx
│   ├── reviews/
│   │   ├── ReviewList.tsx
│   │   ├── ReviewCard.tsx
│   │   ├── ReviewForm.tsx
│   │   └── RatingSummary.tsx
│   ├── notifications/
│   │   ├── NotificationBell.tsx     # Header badge
│   │   └── NotificationList.tsx
│   └── admin/
│       ├── BusinessStatusBadge.tsx
│       ├── ClaimReviewCard.tsx
│       └── AnalyticsChart.tsx
│
├── hooks/
│   ├── useMarketplace.ts            # Read MarketplaceContext
│   ├── useCurrentUser.ts            # Auth user + JWT
│   ├── usePaginatedQuery.ts         # Cursor-based pagination helper
│   ├── useEngagementTracker.ts      # Fire-and-forget event tracker
│   └── useMediaUpload.ts            # presign → PUT → attach flow
│
├── services/
│   ├── api.ts                       # Axios instance, token + slug injection, error handling
│   ├── auth.service.ts
│   └── marketplace.service.ts
│
├── types/
│   ├── api.types.ts                 # Re-exports from @workspace/api-zod
│   ├── marketplace.types.ts
│   └── ui.types.ts
│
└── lib/
    ├── utils.ts                     # cn(), formatPrice(NGN), formatDate()
    ├── constants.ts                 # MARKETPLACE_SLUG, API_BASE_URL
    └── queryClient.ts               # React Query client setup
```

---

## 4. Feature Priority Matrix

### Phase A — MVP Critical

| Feature | User | Key Screens |
|---|---|---|
| App shell + routing + providers | All | All layouts |
| Register + Login + Logout | All | LoginPage, RegisterPage |
| Email verification | All | VerifyEmailPage |
| Marketplace context load | All | MarketplaceProvider |
| Category browse | Consumer | CategoryPage |
| Location browse | Consumer | Filter pickers (cascade) |
| Business directory (paginated) | Consumer | DirectoryPage |
| Business search | Consumer | SearchPage |
| Business profile (public) | Consumer | BusinessProfilePage |
| Business onboarding wizard | Owner | OnboardingPage |
| Business profile edit | Owner | BusinessSettingsPage |
| Hours management | Owner | HoursPage |
| Contacts management | Owner | ContactsPage |
| Products CRUD | Owner | ProductsPage |
| Services CRUD | Owner | ServicesPage |
| Business updates | Owner | UpdatesPage |

### Phase B — Post-MVP

| Feature | User | Key Screens | Note |
|---|---|---|---|
| Portfolio + media upload | Owner | PortfolioPage | Needs Gap #4 fixed |
| Reviews (read + write) | Consumer | BusinessProfilePage | None |
| Saved items | Consumer | SavedItemsPage | None |
| Notifications bell + list | All | Header + NotificationsPage | None |
| Claim a business | Consumer | ClaimButton on profile | None |
| Branches management | Owner | BranchesPage | None |
| Service areas | Owner | ServiceAreasPage | None |
| Verification status view | Owner | VerificationPage | None |
| Engagement tracking | Consumer | Passive on profile load | None |

### Phase C — Admin + Analytics

| Feature | User | Key Screens | Note |
|---|---|---|---|
| Admin dashboard | Admin | AdminDashboardPage | Needs Gap #2 fixed |
| Business management | Admin | BusinessesPage | Needs Gap #2 |
| Claim review | Admin | ClaimsPage | Needs Gap #2 |
| Review moderation | Admin | ReviewsPage | Needs Gap #6 |
| Analytics summary | Admin | AnalyticsPage | Needs Gap #2 |
| Password reset | All | ForgotPasswordPage | Needs Gap #5 |

---

## 5. Screen Inventory & Specs

### AUTH

---

#### SCR-A01 — Login Page
- **Route:** `/login`
- **API:** `POST /api/v1/auth/login`
- **Permission:** Public (unauthenticated only)
- **Form fields:** `email`, `password`
- **Components:** `AuthLayout`, `LoginForm`, `Input`, `Button`, `Link to /register`
- **Error states:** 401 → "Incorrect email or password"; field-level validation
- **Post-success:** Store JWT → redirect to `/` or `?next=` path

---

#### SCR-A02 — Register Page
- **Route:** `/register`
- **API:** `POST /api/v1/auth/register`
- **Permission:** Public (unauthenticated only)
- **Form fields:** `displayName`, `email`, `password` (min 8 chars)
- **Components:** `AuthLayout`, `RegisterForm`, `PasswordStrengthBar`
- **Error states:** 409 → "Email already in use"; field-level errors
- **Post-success:** Store JWT → "Check your email" banner → redirect to `/`

---

#### SCR-A03 — Verify Email Page
- **Route:** `/verify-email?token=<token>`
- **API:** `POST /api/v1/auth/verify-email` with `{ token }`
- **Permission:** Public
- **Behaviour:** Auto-submits token on mount; shows spinner → success/error card
- **Error state:** "Link expired or invalid. Request a new one."
- **Success state:** "Email verified!" → link to home

---

### CONSUMER

---

#### SCR-C01 — Home Page
- **Route:** `/`
- **APIs:**
  - `GET /api/v1/marketplaces/{slug}` — marketplace branding
  - `GET /api/v1/categories` — root category chips
  - `GET /api/v1/businesses?marketplace=fashion-nigeria&limit=8` — featured listings
- **Permission:** Public
- **Components:** `HeroBanner`, `SearchBar`, `CategoryChips`, `BusinessGrid` (featured), `RootLayout`
- **Loading states:** Skeleton cards for featured businesses; shimmer for category chips
- **Empty state:** "Be the first business listed in your city" CTA

---

#### SCR-C02 — Directory Page
- **Route:** `/directory`
- **APIs:**
  - `GET /api/v1/businesses?marketplace=…&limit=20&cursor=…`
  - `GET /api/v1/categories` — filter sidebar
  - `GET /api/v1/locations?country=NG` — location filter cascade
- **Permission:** Public
- **Components:** `RootLayout`, `FilterSidebar`, `BusinessGrid`, cursor pagination
- **Loading state:** Skeleton grid (12 cards) on initial load; spinner on load-more
- **Empty state:** "No businesses found. Try adjusting your filters."

---

#### SCR-C03 — Search Results Page
- **Route:** `/search?q=&category=&location=`
- **APIs:**
  - `GET /api/v1/search/businesses?q=&categorySlug=&locationSlug=&marketplace=…`
  - `GET /api/v1/search/suggestions?q=&marketplace=…` — autocomplete
- **Permission:** Public
- **Components:** `SearchBar` (sticky), `ActiveFilterTags`, `SearchResults`, `BusinessCard`, cursor pagination
- **Debounce:** 300ms on search input
- **Error state:** pg_trgm not installed → "Search is temporarily unavailable"
- **Empty state:** "No results for '{q}'. Try a broader search or browse by category."

---

#### SCR-C04 — Business Profile Page
- **Route:** `/business/:slug`
- **APIs (parallel loads):**
  - `GET /api/v1/businesses/{slug}?marketplace=…` — core profile
  - `GET /api/v1/businesses/{id}/hours`
  - `GET /api/v1/businesses/{id}/contacts`
  - `GET /api/v1/businesses/{id}/branches`
  - `GET /api/v1/businesses/{id}/service-areas`
  - `GET /api/v1/businesses/{id}/products`
  - `GET /api/v1/businesses/{id}/services`
  - `GET /api/v1/businesses/{id}/portfolio`
  - `GET /api/v1/reviews?businessId=…`
  - `GET /api/v1/reviews/summary?businessId=…`
  - `POST /api/v1/engagement/track` — `profile_view` on mount
- **Permission:** Public (read); auth required for review/save/claim
- **Components:**
  - `BusinessHero` (name, tagline, location, badges, status)
  - `ContactButtons` (WhatsApp `wa.me/`, Call `tel:`, Email `mailto:`, Website)
  - `HoursTable` (7 rows, today highlighted)
  - `TabPanel`: Products | Services | Portfolio | Reviews | Updates
  - `RatingSummary` + `ReviewForm` (auth-gated)
  - `SaveButton` (toggle, auth-gated)
  - `ClaimButton` (if `claimStatus === 'unclaimed'`, auth-gated)
- **Error state:** 404 → "Business not found" card + back to directory link
- **Note:** Businesses in `draft` status return 404 on the public endpoint.

---

#### SCR-C05 — Category Browse Page
- **Route:** `/category/:slug`
- **APIs:**
  - `GET /api/v1/categories/{slug}` — category + children
  - `GET /api/v1/search/businesses?categorySlug=…&marketplace=…`
- **Permission:** Public
- **Components:** `Breadcrumb`, `SubCategoryGrid`, `BusinessGrid` (filtered)
- **Empty state:** "No businesses in this category yet."

---

#### SCR-C06 — Saved Items Page
- **Route:** `/saved`
- **APIs:** `GET /api/v1/saved-items`, `DELETE /api/v1/saved-items/{id}`
- **Permission:** Auth required (401 → redirect to `/login?next=/saved`)
- **Components:** `RootLayout`, `SavedItemCard`, empty state illustration
- **Empty state:** "Browse the directory to save businesses you like."

---

#### SCR-C07 — Notifications Page
- **Route:** `/notifications`
- **APIs:**
  - `GET /api/v1/notifications?limit=20&cursor=…`
  - `PATCH /api/v1/notifications/read-all`
  - `PATCH /api/v1/notifications/{id}/read`
  - `DELETE /api/v1/notifications/{id}`
- **Permission:** Auth required
- **Components:** `NotificationList`, `NotificationItem`, "Mark all read" button
- **Empty state:** "You're all caught up."

---

### BUSINESS OWNER

All owner screens under `/dashboard` require auth. The `RequireRole` guard checks for `business_owner` or `business_manager`.

---

#### SCR-O01 — Business Creation Wizard (Onboarding)
- **Route:** `/dashboard/onboarding`
- **API:** `POST /api/v1/businesses?marketplace=…`
- **Permission:** Any authenticated user (no business role needed to create)
- **Steps:**
  1. Business name + tagline
  2. Category picker (tree, multi-select, **min 1 required**)
  3. Location cascade (state → LGA → town)
  4. Contacts (WhatsApp, phone)
  5. Review + submit
- **Components:** `StepIndicator`, `BusinessNameForm`, `CategoryPicker`, `LocationCascade`, `ContactForm`, `ReviewStep`
- **Post-success:** Redirect to `/dashboard/profile` with "Business created! Pending admin review." banner

---

#### SCR-O02 — Owner Dashboard (Overview)
- **Route:** `/dashboard`
- **Components:** `BusinessStatusCard` (status badge: draft/active/suspended), `QuickStats` (product/service/review counts), "Pending review" info banner for draft businesses
- **Empty state (no business yet):** "Create your first business" CTA → `/dashboard/onboarding`

---

#### SCR-O03 — Business Profile Settings
- **Route:** `/dashboard/profile`
- **API:** `PATCH /api/v1/businesses/{id}?marketplace=…`
- **Form sections:** Basic info (name, tagline, description), Location, Website/email, WhatsApp/phone
- **Components:** `DashboardLayout`, `BusinessForm`, `LocationCascade`, `UnsavedChangesPrompt`
- **Error states:** 409 slug conflict, 403 not owner

---

#### SCR-O04 — Business Hours
- **Route:** `/dashboard/hours`
- **APIs:** `GET /api/v1/businesses/{id}/hours`, `PUT /api/v1/businesses/{id}/hours`
- **Components:** `HoursEditor` — 7-row table: Day | Closed toggle | Opens At | Closes At
- **Validation:** HH:MM format; `opens_at` < `closes_at` when not closed; bulk PUT (not per-day)

---

#### SCR-O05 — Contacts
- **Route:** `/dashboard/contacts`
- **APIs:** `listBusinessContacts`, `createBusinessContact`, `updateBusinessContact`, `deleteBusinessContact`
- **Contact types:** `phone`, `whatsapp`, `email`, `website`, `instagram`, `facebook`, `twitter`, `tiktok`, `youtube`, `other`
- **Key gotcha:** Field is `contactType`, **not** `type`
- **Components:** `ContactList`, `ContactForm` (Sheet/Dialog), type icon mapping

---

#### SCR-O06 — Products
- **Route:** `/dashboard/products`
- **APIs:** `listProducts`, `createProduct`, `updateProduct`, `deleteProduct`
- **Table columns:** Name | Price (NGN) | Stock Status | Sort | Actions
- **Form fields:** `name`, `description`, `price` (numeric string e.g. `"15000"`), `currencyId` (NGN UUID from marketplace context), `unit`, `stockStatus`, `sortOrder`
- **Key gotcha:** Use `price` + `currencyId`, **not** `pricingType` / `priceAmount`

---

#### SCR-O07 — Services
- **Route:** `/dashboard/services`
- **APIs:** `listServices`, `createService`, `updateService`, `deleteService`
- **Form fields:** `name`, `description`, `priceFrom`, `priceTo`, `currencyId`, `durationMinutes`, `availability`, `categoryId`

---

#### SCR-O08 — Portfolio
- **Route:** `/dashboard/portfolio`
- **APIs:** `listPortfolios`, `createPortfolio`, `updatePortfolio`, `deletePortfolio`, `addPortfolioItem`, `deletePortfolioItem`, `presignBusinessMediaUpload`, `attachBusinessMedia`
- **Flow:** Create collection → upload image (presign → PUT to URL → attach) → add as portfolio item
- **Note:** Media upload URL is a stub in dev. Build the UI flow; it will work once Gap #4 is resolved.

---

#### SCR-O09 — Business Updates
- **Route:** `/dashboard/updates`
- **APIs:** `listBusinessUpdates`, `createBusinessUpdate`, `patchBusinessUpdate`, `deleteBusinessUpdate`
- **Update types:** `news` | `offer` | `event` | `announcement` (badge color-coded)
- **Components:** `UpdatesTable`, `UpdateForm` (Sheet), type badge, published/draft toggle

---

#### SCR-O10 — Branches
- **Route:** `/dashboard/branches`
- **APIs:** `listBusinessBranches`, `createBusinessBranch`, `updateBusinessBranch`, `deleteBusinessBranch`
- **Components:** `BranchList`, `BranchForm` (Sheet), `LocationCascade`

---

#### SCR-O11 — Service Areas
- **Route:** `/dashboard/service-areas`
- **APIs:** `listBusinessServiceAreas`, `addBusinessServiceArea`, `deleteBusinessServiceArea`
- **Components:** `ServiceAreaList`, `LocationPicker` (Combobox for location search), remove badges

---

#### SCR-O12 — Verification Status
- **Route:** `/dashboard/verification`
- **APIs:** `getVerificationTypes`, `listBusinessVerifications`
- **Components:** `VerificationTypeCard` (status badge: pending/verified/failed), score progress bar
- **Note:** Verification initiation is admin-only. Owners can only view status.

---

### ADMIN

All admin screens under `/admin` require auth + `marketplace_admin` or `marketplace_moderator` role.

---

#### SCR-AD01 — Admin Dashboard
- **Route:** `/admin`
- **API:** `GET /api/v1/admin/analytics/summary?marketplace=…`
- **Permission:** `analytics:read:marketplace`
- **Components:** `AdminLayout`, `KPICard` × 4 (total businesses, active, pending claims, reviews today), `ActivityFeed`

---

#### SCR-AD02 — Business Management
- **Route:** `/admin/businesses`
- **API:**
  - `GET /api/v1/admin/businesses?marketplace=…&status=&q=`
  - `PATCH /api/v1/admin/businesses/{id}/status`
- **Permission:** `business:publish`, `business:update`
- **Table columns:** Name | Status | Claim Status | Verification Score | Created | Actions
- **Status filter tabs:** All | Draft | Active | Suspended | Archived
- **Actions:** Publish (→ `active`) | Suspend | Archive (with reason textarea)

---

#### SCR-AD03 — Claim Requests
- **Route:** `/admin/claims`
- **APIs:**
  - `GET /api/v1/admin/claim-requests?marketplace=…&status=pending`
  - `PATCH /api/v1/admin/claim-requests/{id}`
- **Permission:** `claim:review`
- **Table columns:** Business | Claimant | Submitted | Evidence | Status | Actions
- **Actions:** Approve | Reject with optional admin note

---

#### SCR-AD04 — Review Moderation
- **Route:** `/admin/reviews`
- **API:**
  - `GET /api/v1/reviews?businessId=…` — no admin-wide list exists (Gap #6)
  - `PATCH /api/v1/admin/reviews/{id}/moderation`
- **Permission:** `review:moderate`
- **MVP workaround:** Business search input to select a business, then load its reviews
- **Actions:** Approve | Flag | Remove

---

#### SCR-AD05 — Analytics
- **Route:** `/admin/analytics`
- **APIs:**
  - `GET /api/v1/admin/analytics/summary?marketplace=…`
  - `GET /api/v1/admin/analytics/search?marketplace=…&days=30`
- **Permission:** `analytics:read:marketplace`
- **Components:** `AreaChart` (business growth via Recharts), `BarChart` (top search terms), `DataTable` (zero-result searches)

---

## 6. Sprint Plan

### Sprint 1 — App Shell + Auth (Days 1–3)

**Goal:** Working skeleton with full auth flow.

- [ ] Vite + TypeScript + Tailwind config in `artifacts/mockup-sandbox`
- [ ] `QueryProvider` (staleTime: 60s, retry: 1)
- [ ] `AuthProvider` (JWT in localStorage, expiry check, token injection)
- [ ] `MarketplaceProvider` (hardcode `fashion-nigeria` for MVP)
- [ ] `createBrowserRouter` + all 4 layouts
- [ ] `RequireAuth` + `RequireRole` guards
- [ ] `LoginPage` + `LoginForm` + `useAuthLogin` mutation
- [ ] `RegisterPage` + `RegisterForm` + `useAuthRegister` mutation
- [ ] `VerifyEmailPage` (auto-submit token on mount)
- [ ] Axios interceptor: 401 → clear token + redirect to login
- [ ] `NotFoundPage` + `ForbiddenPage`

**Done when:** Register → login → `/me` → logout all work. JWT persists across refresh.

---

### Sprint 2 — Home Page + Marketplace Context (Days 4–5)

**Goal:** Landing page renders with live API data.

- [ ] `MarketplaceProvider` fetches + caches marketplace context
- [ ] `useMarketplace()` hook injects slug header into all queries
- [ ] `HomePage`: `HeroBanner`, `SearchBar` (no autocomplete yet), `CategoryChips`
- [ ] `useListCategories` → root categories as chips
- [ ] `BusinessGrid` (featured, limit 8) → `BusinessCard`
- [ ] `RootLayout`: Navbar (logo + search icon + login CTA) + Footer
- [ ] Responsive layout (mobile-first)

**Done when:** Home page loads category chips and featured business cards from live API.

---

### Sprint 3 — Directory + Category Browse (Days 6–8)

**Goal:** Browsable, filterable business directory.

- [ ] `DirectoryPage` with infinite scroll / load-more (cursor pagination)
- [ ] `usePaginatedQuery` cursor helper hook
- [ ] `FilterSidebar`: category multi-select tree + location cascade, collapsible on mobile
- [ ] `LocationCascade` component (state → LGA → town, shared across all use cases)
- [ ] `CategoryPage` — child categories grid + filtered business list
- [ ] URL-sync for filters (`?category=&location=` via `useSearchParams`)
- [ ] `BusinessCard` finalised: name, tagline, location badge, verification score, WhatsApp CTA

**Done when:** Directory paginates live businesses; category/location filters narrow results.

---

### Sprint 4 — Business Profile (Public) (Days 9–11)

**Goal:** Complete public-facing business listing page.

- [ ] `BusinessProfilePage` with tab layout (Overview | Products | Services | Portfolio | Reviews)
- [ ] `BusinessHero`: banner, name, tagline, location, status badges, contact buttons
- [ ] `ContactButtons`: WhatsApp (`wa.me/`), Call (`tel:`), Email (`mailto:`), Website
- [ ] `HoursTable`: 7-row display, today highlighted
- [ ] Product tab: `ProductList` read-only with price formatted as NGN
- [ ] Service tab: `ServiceList` read-only with price range
- [ ] Portfolio tab: `PortfolioGrid` masonry
- [ ] Reviews tab: `RatingSummary` + `ReviewList`
- [ ] `SaveButton` (toggle, auth-gated)
- [ ] `ClaimButton` (shows if `claimStatus === 'unclaimed'`, auth-gated)
- [ ] Engagement tracking: fire `profile_view` on mount via `trackEngagementEvent`

**Done when:** Full business profile renders all data; save and engagement tracking work.

---

### Sprint 5 — Search (Days 12–14)

**Pre-condition:** `CREATE EXTENSION IF NOT EXISTS pg_trgm;` must be run in the DB first.

- [ ] `SearchBar` debounced autocomplete (300ms, min 2 chars) via `searchSuggestions`
- [ ] Autocomplete dropdown: businesses + categories + locations sections
- [ ] `SearchPage`: URL-driven (all params in URL → shareable links)
- [ ] `ActiveFilterTags`: removable pills per active filter
- [ ] Category + location filters in search (reuse `FilterSidebar`)
- [ ] Tabs: Businesses | Products | Services | Updates
- [ ] Zero-results state with suggested categories

**Done when:** Autocomplete works; full search returns filtered results; URL is shareable.

---

### Sprint 6 — Business Owner: Onboarding + Core Settings (Days 15–18)

**Goal:** Business owner can create and manage their business.

- [ ] `OnboardingPage` (5-step wizard): name/tagline → categories → location → contacts → review
- [ ] `CategoryPicker`: tree view, multi-select, min 1 required
- [ ] `DashboardLayout` with sidebar navigation (all 10 owner sections)
- [ ] `DashboardPage`: status card, quick stats, "pending review" banner for drafts
- [ ] `BusinessSettingsPage`: full edit form, pre-filled from API
- [ ] `HoursPage`: `HoursEditor` 7-day bulk PUT
- [ ] `ContactsPage`: list + add/edit/delete with all 10 contact types
- [ ] Auth redirect: unauthenticated → login; no business → onboarding

**Done when:** New user can create a business and edit all core settings from dashboard.

---

### Sprint 7 — Products + Services + Updates (Days 19–21)

- [ ] `ProductsPage`: DataTable + `ProductForm` in Sheet
  - Fields: `name`, `description`, `price` (numeric), `currencyId` (NGN), `unit`, `stockStatus`, `sortOrder`
- [ ] `ServicesPage`: DataTable + `ServiceForm` in Sheet
  - Fields: `name`, `description`, `priceFrom`, `priceTo`, `currencyId`, `durationMinutes`, `availability`
- [ ] `UpdatesPage`: DataTable + `UpdateForm`; type badges (news/offer/event/announcement); published/draft toggle
- [ ] Soft-delete with undo toast (5s window via Sonner)
- [ ] `ConfirmDeleteDialog` reusable component

**Done when:** Owner can manage full catalogue of products, services, and updates.

---

### Sprint 8 — Portfolio + Media + Branches + Service Areas (Days 22–25)

- [ ] `PortfolioPage`: collection list + item grid
- [ ] `PortfolioForm`: create/edit collection
- [ ] `MediaUploader`: file picker → presign → PUT → attach (UI complete; uploads to stub URL in dev)
- [ ] `PortfolioItemUploader`: attach uploaded media with caption
- [ ] `BranchesPage`: list + `BranchForm` with `LocationCascade`
- [ ] `ServiceAreasPage`: location multi-picker + list with delete
- [ ] `VerificationPage`: type cards with status badge + score progress bar

**Done when:** Owner can manage portfolio, branches, and service areas.

---

### Sprint 9 — Reviews + Saved Items + Notifications (Days 26–28)

- [ ] `ReviewForm` on BusinessProfilePage: star rating + title + body + `isAnonymous` toggle (auth-gated)
- [ ] Edit + delete own reviews
- [ ] `SavedItemsPage`: list with remove action
- [ ] `NotificationBell` in Navbar: unread count badge (poll `unreadNotificationCount` every 60s)
- [ ] `NotificationsPage`: paginated list; mark read; mark all read; delete; click → `actionUrl`

**Done when:** Consumer can review businesses, save items, and manage notifications.

---

### Sprint 10 — Admin Panel (Days 29–33)

**Pre-condition:** Seed admin user with `marketplace_admin` role (Gap #2).

- [ ] `AdminLayout` with sidebar (Dashboard | Businesses | Claims | Reviews | Analytics)
- [ ] `AdminDashboardPage`: KPI cards from `adminAnalyticsSummary`
- [ ] `BusinessesPage`: DataTable (all statuses) + status filter tabs + search + `BusinessStatusDialog`
- [ ] `ClaimsPage`: pending claims table + `ClaimReviewSheet` (approve/reject + admin note)
- [ ] `ReviewsPage`: business search input → load reviews → moderation actions
- [ ] `AnalyticsPage`: `AreaChart` (growth) + `BarChart` (top searches) via Recharts
- [ ] `RequireRole` guard on all `/admin/*` routes

**Done when:** Admin can publish businesses, review claims, moderate reviews, view analytics.

---

## 7. Component Inventory

### Shadcn UI Components (already installed in mockup-sandbox/src/components/ui/)

Ready to use without additional setup:

`Accordion` · `Alert` · `AlertDialog` · `AspectRatio` · `Avatar` · `Badge` · `Breadcrumb` · `Button` · `Calendar` · `Card` · `Carousel` · `Chart` · `Checkbox` · `Collapsible` · `Command` · `ContextMenu` · `DataTable` (TanStack Table) · `Dialog` · `Drawer` · `DropdownMenu` · `Form` (react-hook-form) · `HoverCard` · `Input` · `Label` · `NavigationMenu` · `Popover` · `Progress` · `RadioGroup` · `ScrollArea` · `Select` · `Separator` · `Sheet` · `Sidebar` · `Skeleton` · `Sonner` (toasts) · `Switch` · `Table` · `Tabs` · `Textarea` · `Toggle` · `Tooltip`

**Chart library:** Recharts (already installed) — use for admin analytics screens.

### Custom Components to Build

| Component | Used In | Complexity |
|---|---|---|
| `BusinessCard` | Directory, Search, Home | Low |
| `BusinessHero` | Profile page | Medium |
| `SearchBar` + autocomplete dropdown | Global (Navbar + SearchPage) | High |
| `CategoryPicker` (tree + multi-select) | Onboarding, Filters | Medium |
| `LocationCascade` (state → LGA → town) | Onboarding, Branches, Filters | Medium |
| `HoursEditor` (7-day grid) | Dashboard hours | Medium |
| `ContactEditor` | Dashboard contacts | Low |
| `ProductForm` | Dashboard products | Low |
| `ServiceForm` | Dashboard services | Low |
| `MediaUploader` (presign → PUT → attach) | Portfolio, Logo/Banner | High |
| `ReviewForm` + `StarRating` | Business profile | Medium |
| `RatingSummary` (avg + distribution bars) | Business profile | Low |
| `NotificationBell` (badge + popover) | Navbar | Low |
| `PortfolioGrid` (masonry) | Profile, Dashboard | Medium |
| `StepIndicator` | Onboarding wizard | Low |
| `ActiveFilterTags` | SearchPage | Low |
| `CursorPagination` / infinite scroll | Directory, Search, Admin | Low |
| `KPICard` | Admin dashboard | Low |
| `AnalyticsChart` (Recharts wrapper) | Admin analytics | Medium |
| `BusinessStatusBadge` | Admin, Dashboard | Low |
| `ClaimReviewSheet` | Admin claims | Medium |
| `ConfirmDeleteDialog` | All CRUD tables | Low |
| `UnsavedChangesPrompt` | All settings forms | Low |

---

## 8. Route Map

```
/                                       HomePage               [Public]
/login                                  LoginPage              [Public, unauth only]
/register                               RegisterPage           [Public, unauth only]
/verify-email                           VerifyEmailPage        [Public]
/403                                    ForbiddenPage          [Public]
/404                                    NotFoundPage           [Public]

/directory                              DirectoryPage          [Public]
/search                                 SearchPage             [Public]
/business/:slug                         BusinessProfilePage    [Public]
/category/:slug                         CategoryPage           [Public]
/saved                                  SavedItemsPage         [RequireAuth]
/notifications                          NotificationsPage      [RequireAuth]

/dashboard                              DashboardPage          [RequireAuth]
/dashboard/onboarding                   OnboardingPage         [RequireAuth]
/dashboard/profile                      BusinessSettingsPage   [RequireAuth + business_owner]
/dashboard/hours                        HoursPage              [RequireAuth + business_owner]
/dashboard/contacts                     ContactsPage           [RequireAuth + business_owner]
/dashboard/products                     ProductsPage           [RequireAuth + business_owner]
/dashboard/services                     ServicesPage           [RequireAuth + business_owner]
/dashboard/portfolio                    PortfolioPage          [RequireAuth + business_owner]
/dashboard/updates                      UpdatesPage            [RequireAuth + business_owner]
/dashboard/branches                     BranchesPage           [RequireAuth + business_owner]
/dashboard/service-areas                ServiceAreasPage       [RequireAuth + business_owner]
/dashboard/verification                 VerificationPage       [RequireAuth + business_owner]

/admin                                  AdminDashboardPage     [RequireRole: marketplace_admin]
/admin/businesses                       BusinessesPage         [RequireRole: marketplace_admin]
/admin/claims                           ClaimsPage             [RequireRole: marketplace_admin|marketplace_moderator]
/admin/reviews                          ReviewsPage            [RequireRole: marketplace_admin|marketplace_moderator]
/admin/analytics                        AnalyticsPage          [RequireRole: marketplace_admin|marketplace_analyst]
```

---

## 9. API Client Setup

### Generated hooks

React Query hooks are auto-generated in `lib/api-client-react/src/generated/`. Regenerate after any OpenAPI change:

```bash
pnpm --filter @workspace/api-spec run codegen
```

### Axios instance

```typescript
// src/services/api.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['X-Marketplace-Slug'] = 'fashion-nigeria';
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('access_token');
      const next = encodeURIComponent(window.location.pathname);
      window.location.href = `/login?next=${next}`;
    }
    // Show global error toast for 500s via Sonner
    return Promise.reject(err);
  }
);
```

### React Query client

```typescript
// src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,      // 1 minute
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

### Response envelope

All API responses are wrapped: `{ data: <payload> }`. Pagination shape: `{ data: { items: [], nextCursor: string|null, hasMore: boolean, count: number } }`. Extract `.data` in the query `select` option or in an Axios response interceptor.

---

## 10. Key Implementation Gotchas

| Gotcha | Detail |
|---|---|
| **Product pricing fields** | Use `price` (numeric string, e.g. `"15000"`) + `currencyId` (NGN UUID). Not `pricingType` / `priceAmount`. |
| **Contact type field** | Field is `contactType`, not `type`. Enum: phone, whatsapp, email, website, instagram, facebook, twitter, tiktok, youtube, other. |
| **Marketplace slug header** | Send `X-Marketplace-Slug: fashion-nigeria` on **every** request, or `?marketplace=fashion-nigeria` query param. |
| **Cursor pagination** | No page numbers — use `nextCursor` from each response. `hasMore === false` means no more pages. |
| **Draft businesses return 404** | Public `GET /businesses/{slug}` returns 404 for draft businesses. Show "Pending review" banner in dashboard instead of relying on public URL. |
| **pg_trgm required for search** | Run `CREATE EXTENSION IF NOT EXISTS pg_trgm;` in the database before any search with `?q=` will work. |
| **Admin review list doesn't exist** | `GET /reviews` requires `?businessId=`. There is no admin-wide review list endpoint. Use a business picker in the admin UI as workaround. |
| **No refresh token endpoint** | JWT is short-lived. On 401, clear token and redirect to login. A refresh token flow is not implemented. |
| **NGN currency ID** | Don't hardcode. Fetch from `getMarketplace` → `currency.id` and provide via `MarketplaceProvider`. |
| **`pg_trgm` similarity search** | The backend uses raw SQL `similarity()` + ILIKE — so partial word matches and typo tolerance work once the extension is installed. |
