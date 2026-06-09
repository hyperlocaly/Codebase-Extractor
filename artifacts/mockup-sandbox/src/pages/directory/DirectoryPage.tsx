import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useBusinessList } from '@/hooks/useBusinessList';
import { useMarketplace } from '@/providers/MarketplaceProvider';
import { FilterSidebar } from '@/components/directory/FilterSidebar';
import { ActiveFilterTags } from '@/components/directory/ActiveFilterTags';
import { LoadMore } from '@/components/directory/LoadMore';
import { BusinessGrid } from '@/components/business/BusinessGrid';
import { Button } from '@/components/ui/button';
import { AlertCircle, LayoutGrid } from 'lucide-react';

export default function DirectoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { marketplace } = useMarketplace();

  const categorySlug = searchParams.get('category') ?? undefined;
  const locationSlug = searchParams.get('location') ?? undefined;

  const { businesses, isLoading, isLoadingMore, isError, hasMore, loadMore, refetch, count } =
    useBusinessList({ categorySlug, locationSlug });

  const handleCategoryChange = useCallback(
    (slug?: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (slug) next.set('category', slug);
        else next.delete('category');
        next.delete('cursor');
        return next;
      });
    },
    [setSearchParams],
  );

  const handleLocationChange = useCallback(
    (slug?: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (slug) next.set('location', slug);
        else next.delete('location');
        next.delete('cursor');
        return next;
      });
    },
    [setSearchParams],
  );

  const activeFilters = [
    ...(categorySlug
      ? [
          {
            key: 'category',
            label: `Category: ${categorySlug.replace(/-/g, ' ')}`,
            onRemove: () => handleCategoryChange(undefined),
          },
        ]
      : []),
    ...(locationSlug
      ? [
          {
            key: 'location',
            label: `Location: ${locationSlug.replace(/-ng$/, '').replace(/-/g, ' ')}`,
            onRemove: () => handleLocationChange(undefined),
          },
        ]
      : []),
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <LayoutGrid className="h-5 w-5 text-primary" />
            Business Directory
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {marketplace?.name ?? 'Fashion Nigeria'} — all verified businesses
          </p>
        </div>
        <div className="flex items-center gap-2">
          <FilterSidebar
            categorySlug={categorySlug}
            locationSlug={locationSlug}
            onCategoryChange={handleCategoryChange}
            onLocationChange={handleLocationChange}
          />
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div className="mb-4">
          <ActiveFilterTags filters={activeFilters} />
        </div>
      )}

      <div className="flex gap-6">
        <FilterSidebar
          categorySlug={categorySlug}
          locationSlug={locationSlug}
          onCategoryChange={handleCategoryChange}
          onLocationChange={handleLocationChange}
        />

        <div className="flex-1 min-w-0">
          {isError ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed bg-muted/20 px-6 py-14 text-center">
              <AlertCircle className="h-8 w-8 text-destructive/60" />
              <p className="text-sm font-medium text-destructive">
                Failed to load businesses
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Try Again
              </Button>
            </div>
          ) : (
            <>
              <BusinessGrid
                businesses={businesses}
                isLoading={isLoading}
                skeletonCount={12}
              />
              {!isLoading && (
                <LoadMore
                  hasMore={hasMore}
                  isLoading={isLoadingMore}
                  onLoadMore={loadMore}
                  count={count}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
