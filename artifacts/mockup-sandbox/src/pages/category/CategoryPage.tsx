import { useParams, Link } from 'react-router-dom';
import { useGetCategory, useListCategories } from '@workspace/api-client-react';
import type { CategorySummary } from '@workspace/api-client-react';
import { useBusinessList } from '@/hooks/useBusinessList';
import { BusinessGrid } from '@/components/business/BusinessGrid';
import { LoadMore } from '@/components/directory/LoadMore';
import { ActiveFilterTags } from '@/components/directory/ActiveFilterTags';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, ChevronRight, Layers } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useCallback } from 'react';

const CATEGORY_ICONS: Record<string, string> = {
  tailor: '🧵',
  'fashion-designer': '✂️',
  'fabric-seller': '🪡',
  'embroidery-service': '🌸',
  'pattern-maker': '📐',
  'accessory-supplier': '💎',
  'fashion-trainer': '📚',
  'fashion-tailoring': '👗',
};

function CategoryPageSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 space-y-3">
        <div className="h-4 w-48 animate-pulse rounded bg-muted" />
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="h-4 w-96 animate-pulse rounded bg-muted" />
      </div>
      <BusinessGrid businesses={[]} isLoading skeletonCount={6} />
    </div>
  );
}

function SubCategoryChips({ categories }: { categories: CategorySummary[] }) {
  if (categories.length === 0) return null;
  return (
    <div className="mb-6">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Subcategories
      </p>
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            to={`/category/${cat.slug}`}
            className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-sm font-medium transition-colors hover:bg-primary hover:text-primary-foreground hover:border-primary"
          >
            <span className="text-base leading-none">
              {CATEGORY_ICONS[cat.slug] ?? '🏪'}
            </span>
            {cat.name}
            <ChevronRight className="h-3 w-3 opacity-50" />
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const locationSlug = searchParams.get('location') ?? undefined;

  const { data: catData, isLoading: catLoading, isError: catError } = useGetCategory(slug!);
  const { data: childrenData } = useListCategories({ parent: slug });

  const category = catData?.data;
  const children: CategorySummary[] = childrenData?.data ?? [];
  const isRoot = category?.depth === 0;

  const { businesses, isLoading, isLoadingMore, isError, hasMore, loadMore, refetch, count } =
    useBusinessList({ categorySlug: slug, locationSlug });

  const handleLocationRemove = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('location');
      return next;
    });
  }, [setSearchParams]);

  const activeFilters = locationSlug
    ? [
        {
          key: 'location',
          label: `Location: ${locationSlug.replace(/-ng$/, '').replace(/-/g, ' ')}`,
          onRemove: handleLocationRemove,
        },
      ]
    : [];

  if (catLoading) return <CategoryPageSkeleton />;

  if (catError || !category) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <AlertCircle className="h-10 w-10 text-destructive/50" />
        <p className="text-sm font-medium text-muted-foreground">
          Category not found.
        </p>
        <Button variant="outline" size="sm" asChild>
          <Link to="/directory">Back to Directory</Link>
        </Button>
      </div>
    );
  }

  const icon = CATEGORY_ICONS[category.slug] ?? '🏪';

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Breadcrumb className="mb-5">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/directory">Directory</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {category.depth === 1 && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/category/fashion-tailoring">Fashion & Tailoring</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
            </>
          )}
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{category.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mb-6 flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-3xl">
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{category.name}</h1>
            {children.length > 0 && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Layers className="h-3 w-3" />
                {children.length} subcategor{children.length !== 1 ? 'ies' : 'y'}
              </Badge>
            )}
          </div>
          {category.description && (
            <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
          )}
        </div>
      </div>

      {children.length > 0 && <SubCategoryChips categories={children} />}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold">
          Businesses
          {count > 0 && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({count} found)
            </span>
          )}
        </h2>
        {activeFilters.length > 0 && (
          <ActiveFilterTags filters={activeFilters} />
        )}
      </div>

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
            skeletonCount={6}
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
  );
}
