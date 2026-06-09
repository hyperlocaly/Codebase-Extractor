import { useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  useSearchBusinesses,
  useSearchProducts,
  useSearchServices,
  useSearchUpdates,
} from '@workspace/api-client-react';
import type {
  BusinessSummary,
  SearchProducts200DataItem,
  SearchServices200DataItem,
  SearchUpdates200DataItem,
  PaginationMeta,
} from '@workspace/api-client-react';
import { SearchBar } from '@/components/search/SearchBar';
import { ActiveFilterTags } from '@/components/directory/ActiveFilterTags';
import { FilterSidebar } from '@/components/directory/FilterSidebar';
import { BusinessCard, BusinessCardSkeleton } from '@/components/business/BusinessCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertCircle,
  Building2,
  Package,
  Scissors,
  Rss,
  Search,
  ArrowRight,
  Tag,
  Megaphone,
  Newspaper,
  CalendarDays,
  Gift,
} from 'lucide-react';
import { MARKETPLACE_SLUG } from '@/lib/constants';

const TABS = ['businesses', 'products', 'services', 'updates'] as const;
type Tab = (typeof TABS)[number];

function isValidTab(s: string | null): s is Tab {
  return TABS.includes(s as Tab);
}

function useSearchState() {
  const [searchParams, setSearchParams] = useSearchParams();

  const q = searchParams.get('q') ?? '';
  const rawTab = searchParams.get('tab');
  const tab: Tab = isValidTab(rawTab) ? rawTab : 'businesses';
  const categorySlug = searchParams.get('category') ?? undefined;
  const locationSlug = searchParams.get('location') ?? undefined;

  function setQ(newQ: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newQ) next.set('q', newQ);
      else next.delete('q');
      return next;
    });
  }

  function setTab(newTab: Tab) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', newTab);
      return next;
    });
  }

  function setCategory(slug?: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (slug) next.set('category', slug);
      else next.delete('category');
      return next;
    });
  }

  function setLocation(slug?: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (slug) next.set('location', slug);
      else next.delete('location');
      return next;
    });
  }

  return { q, tab, categorySlug, locationSlug, setQ, setTab, setCategory, setLocation };
}

function EmptyState({
  title,
  sub,
  icon,
}: {
  title: string;
  sub: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed bg-muted/20 px-8 py-16 text-center">
      <div className="mb-3 text-muted-foreground/40">{icon}</div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed bg-muted/20 py-14 text-center">
      <AlertCircle className="h-8 w-8 text-destructive/50" />
      <p className="text-sm font-medium text-destructive">Search failed. Please try again.</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

function ResultCount({ count, loading }: { count: number; loading: boolean }) {
  if (loading) return <div className="h-4 w-24 animate-pulse rounded bg-muted" />;
  return (
    <p className="text-xs text-muted-foreground">
      {count === 0 ? 'No results' : `${count} result${count !== 1 ? 's' : ''}`}
    </p>
  );
}

function BusinessSkeletons({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <BusinessCardSkeleton key={i} />
      ))}
    </div>
  );
}

function BusinessResults({
  q,
  categorySlug,
  locationSlug,
}: {
  q: string;
  categorySlug?: string;
  locationSlug?: string;
}) {
  const { data, isLoading, isError, refetch } = useSearchBusinesses({
    marketplace: MARKETPLACE_SLUG,
    ...(q ? { q } : {}),
    ...(categorySlug ? { categorySlug } : {}),
    ...(locationSlug ? { locationSlug } : {}),
    limit: 18,
  });

  const businesses: BusinessSummary[] = data?.data ?? [];
  const pagination = data?.pagination as PaginationMeta | undefined;

  if (isError) return <ErrorState onRetry={refetch} />;
  if (isLoading) return <BusinessSkeletons />;
  if (businesses.length === 0) {
    return (
      <EmptyState
        icon={<Building2 className="h-10 w-10" />}
        title="No businesses found"
        sub={
          q
            ? `No businesses matched "${q}". Try a different search term.`
            : 'No businesses match the current filters.'
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <ResultCount count={pagination?.count ?? businesses.length} loading={false} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {businesses.map((b) => (
          <BusinessCard key={b.id} business={b} />
        ))}
      </div>
      {pagination?.hasMore && (
        <div className="pt-2 text-center">
          <p className="text-xs text-muted-foreground">
            Showing {businesses.length} of {pagination.count}+ results.{' '}
            <span className="text-primary">Refine your search to see more.</span>
          </p>
        </div>
      )}
    </div>
  );
}

function ProductCard({ product }: { product: SearchProducts200DataItem }) {
  return (
    <Card className="group transition-shadow hover:shadow-md">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Package className="h-5 w-5 text-primary/70" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{product.name}</p>
          {product.businessName && (
            <p className="truncate text-xs text-muted-foreground">{product.businessName}</p>
          )}
          {product.price && (
            <p className="mt-0.5 text-xs font-medium text-primary">₦{product.price}</p>
          )}
        </div>
        <Badge
          variant={product.stockStatus === 'in_stock' ? 'default' : 'secondary'}
          className="shrink-0 text-[10px]"
        >
          {product.stockStatus === 'in_stock' ? 'In Stock' : product.stockStatus ?? 'Available'}
        </Badge>
        {product.businessSlug && (
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" asChild>
            <Link to={`/business/${product.businessSlug}`} aria-label="View business">
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function ProductSkeletons({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="h-10 w-10 shrink-0 animate-pulse rounded-lg bg-muted" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ProductResults({ q }: { q: string }) {
  const { data, isLoading, isError, refetch } = useSearchProducts({
    marketplace: MARKETPLACE_SLUG,
    ...(q ? { q } : {}),
    limit: 20,
  });

  const products: SearchProducts200DataItem[] = data?.data ?? [];

  if (isError) return <ErrorState onRetry={refetch} />;
  if (isLoading) return <ProductSkeletons />;
  if (products.length === 0) {
    return (
      <EmptyState
        icon={<Package className="h-10 w-10" />}
        title="No products found"
        sub={q ? `No products matched "${q}".` : 'No products available right now.'}
      />
    );
  }

  return (
    <div className="space-y-4">
      <ResultCount count={products.length} loading={false} />
      <div className="space-y-2">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}

function ServiceCard({ service }: { service: SearchServices200DataItem }) {
  const hasPrice = service.priceFrom || service.priceTo;
  return (
    <Card className="group transition-shadow hover:shadow-md">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary/40">
          <Scissors className="h-5 w-5 text-secondary-foreground/70" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{service.name}</p>
          {service.businessName && (
            <p className="truncate text-xs text-muted-foreground">{service.businessName}</p>
          )}
          {hasPrice && (
            <p className="mt-0.5 text-xs font-medium text-primary">
              {service.priceFrom && `From ₦${service.priceFrom}`}
              {service.priceTo && ` – ₦${service.priceTo}`}
            </p>
          )}
        </div>
        {service.businessSlug && (
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" asChild>
            <Link to={`/business/${service.businessSlug}`} aria-label="View business">
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function ServiceResults({ q }: { q: string }) {
  const { data, isLoading, isError, refetch } = useSearchServices({
    marketplace: MARKETPLACE_SLUG,
    ...(q ? { q } : {}),
    limit: 20,
  });

  const services: SearchServices200DataItem[] = data?.data ?? [];

  if (isError) return <ErrorState onRetry={refetch} />;
  if (isLoading) return <ProductSkeletons count={4} />;
  if (services.length === 0) {
    return (
      <EmptyState
        icon={<Scissors className="h-10 w-10" />}
        title="No services found"
        sub={q ? `No services matched "${q}".` : 'No services available right now.'}
      />
    );
  }

  return (
    <div className="space-y-4">
      <ResultCount count={services.length} loading={false} />
      <div className="space-y-2">
        {services.map((s) => (
          <ServiceCard key={s.id} service={s} />
        ))}
      </div>
    </div>
  );
}

const UPDATE_TYPE_ICONS: Record<string, React.ReactNode> = {
  news: <Newspaper className="h-4 w-4" />,
  offer: <Gift className="h-4 w-4" />,
  event: <CalendarDays className="h-4 w-4" />,
  announcement: <Megaphone className="h-4 w-4" />,
};

const UPDATE_TYPE_COLORS: Record<string, string> = {
  news: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  offer: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
  event: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  announcement: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
};

function UpdateCard({ update }: { update: SearchUpdates200DataItem }) {
  const type = update.type ?? 'news';
  return (
    <Card className="group transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${UPDATE_TYPE_COLORS[type] ?? 'bg-muted text-muted-foreground'}`}
          >
            {UPDATE_TYPE_ICONS[type] ?? <Rss className="h-4 w-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="truncate text-sm font-semibold">{update.title}</p>
              {update.businessSlug && (
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" asChild>
                  <Link to={`/business/${update.businessSlug}`} aria-label="View business">
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
            {update.businessName && (
              <p className="truncate text-xs text-muted-foreground">{update.businessName}</p>
            )}
            {update.body && (
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground/80">{update.body}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function UpdateResults({ q }: { q: string }) {
  const { data, isLoading, isError, refetch } = useSearchUpdates({
    marketplace: MARKETPLACE_SLUG,
    ...(q ? { q } : {}),
    limit: 20,
  });

  const updates: SearchUpdates200DataItem[] = data?.data ?? [];

  if (isError) return <ErrorState onRetry={refetch} />;
  if (isLoading) return <ProductSkeletons count={4} />;
  if (updates.length === 0) {
    return (
      <EmptyState
        icon={<Rss className="h-10 w-10" />}
        title="No updates found"
        sub={q ? `No updates matched "${q}".` : 'No published updates right now.'}
      />
    );
  }

  return (
    <div className="space-y-4">
      <ResultCount count={updates.length} loading={false} />
      <div className="space-y-2">
        {updates.map((u) => (
          <UpdateCard key={u.id} update={u} />
        ))}
      </div>
    </div>
  );
}

function SearchLanding() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Search className="mb-4 h-12 w-12 text-muted-foreground/30" />
      <h2 className="text-lg font-semibold">Start your search</h2>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        Search for businesses, products, services, and updates across Fashion Nigeria.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {['Tailors', 'Fabric sellers', 'Fashion designers', 'Embroidery', 'Accessories'].map(
          (term) => (
            <a
              key={term}
              href={`/search?q=${encodeURIComponent(term)}`}
              className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              <Tag className="h-3 w-3 text-muted-foreground" />
              {term}
            </a>
          ),
        )}
      </div>
    </div>
  );
}

const TAB_CLASS =
  'relative rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none';

export default function SearchPage() {
  const { q, tab, categorySlug, locationSlug, setQ, setTab, setCategory, setLocation } =
    useSearchState();

  const handleSearch = useCallback(
    (newQ: string) => setQ(newQ),
    [setQ],
  );

  const activeFilters = [
    ...(categorySlug
      ? [
          {
            key: 'category',
            label: `Category: ${categorySlug.replace(/-/g, ' ')}`,
            onRemove: () => setCategory(undefined),
          },
        ]
      : []),
    ...(locationSlug
      ? [
          {
            key: 'location',
            label: `Location: ${locationSlug.replace(/-ng$/, '').replace(/-/g, ' ')}`,
            onRemove: () => setLocation(undefined),
          },
        ]
      : []),
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-6 space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Search className="h-5 w-5 text-primary" />
          Search
        </h1>
        <p className="text-sm text-muted-foreground">
          Find businesses, products, services, and updates
        </p>
      </div>

      <div className="mb-6">
        <SearchBar
          defaultValue={q}
          onSearch={handleSearch}
          placeholder="Search businesses, products, services…"
          size="lg"
          className="w-full"
        />
      </div>

      {!q && activeFilters.length === 0 ? (
        <SearchLanding />
      ) : (
        <>
          {activeFilters.length > 0 && (
            <div className="mb-4">
              <ActiveFilterTags filters={activeFilters} />
            </div>
          )}

          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as Tab)}
            className="w-full"
          >
            <div className="flex gap-6">
              <FilterSidebar
                categorySlug={categorySlug}
                locationSlug={locationSlug}
                onCategoryChange={setCategory}
                onLocationChange={setLocation}
              />

              <div className="min-w-0 flex-1">
                <div className="mb-4 border-b">
                  <TabsList className="h-auto rounded-none bg-transparent p-0 gap-0">
                    <TabsTrigger value="businesses" className={TAB_CLASS}>
                      <Building2 className="mr-1.5 h-3.5 w-3.5" />
                      Businesses
                    </TabsTrigger>
                    <TabsTrigger value="products" className={TAB_CLASS}>
                      <Package className="mr-1.5 h-3.5 w-3.5" />
                      Products
                    </TabsTrigger>
                    <TabsTrigger value="services" className={TAB_CLASS}>
                      <Scissors className="mr-1.5 h-3.5 w-3.5" />
                      Services
                    </TabsTrigger>
                    <TabsTrigger value="updates" className={TAB_CLASS}>
                      <Rss className="mr-1.5 h-3.5 w-3.5" />
                      Updates
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="businesses" className="mt-0">
                  <BusinessResults q={q} categorySlug={categorySlug} locationSlug={locationSlug} />
                </TabsContent>

                <TabsContent value="products" className="mt-0">
                  <ProductResults q={q} />
                </TabsContent>

                <TabsContent value="services" className="mt-0">
                  <ServiceResults q={q} />
                </TabsContent>

                <TabsContent value="updates" className="mt-0">
                  <UpdateResults q={q} />
                </TabsContent>
              </div>
            </div>
          </Tabs>
        </>
      )}
    </div>
  );
}
