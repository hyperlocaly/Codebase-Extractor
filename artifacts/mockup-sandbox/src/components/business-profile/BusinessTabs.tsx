import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type {
  GetBusiness200,
  GetBusinessHours200,
  ListBusinessContacts200,
  ListProducts200,
  ListServices200,
  GetReviewSummary200,
  ListBusinessUpdates200,
  BusinessUpdateItem,
  PortfolioCollection,
  ReviewSummary as ReviewSummaryType,
  ReviewResponse,
} from '@workspace/api-client-react';
import {
  useListReviews,
  useAuthMe,
  ListReviewsSort,
  getListReviewsQueryKey,
  getGetReviewSummaryQueryKey,
} from '@workspace/api-client-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HoursTable } from './HoursTable';
import { ProductList } from './ProductList';
import { ServiceList } from './ServiceList';
import { PortfolioGrid } from './PortfolioGrid';
import { ReviewSummary } from './ReviewSummary';
import { ReviewList, type SortOption } from './ReviewList';
import { ReviewForm } from './ReviewForm';
import { UpdatesList } from './UpdatesList';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Globe, Info, Images, MessageSquare, Package, Rss, Scissors, Loader2 } from 'lucide-react';
import { MARKETPLACE_SLUG } from '@/lib/constants';

type BusinessDetail = NonNullable<GetBusiness200['data']>;
type ReviewWithResponse = ReviewSummaryType & { ownerResponse?: ReviewResponse | null };

interface BusinessTabsProps {
  business: BusinessDetail;
  hours: NonNullable<GetBusinessHours200['data']>;
  hoursLoading: boolean;
  contacts: NonNullable<ListBusinessContacts200['data']>;
  products: NonNullable<ListProducts200['data']>;
  productsLoading: boolean;
  productsError?: boolean;
  onRetryProducts?: () => void;
  services: NonNullable<ListServices200['data']>;
  servicesLoading: boolean;
  servicesError?: boolean;
  onRetryServices?: () => void;
  portfolios: PortfolioCollection[];
  portfoliosLoading: boolean;
  portfoliosError?: boolean;
  onRetryPortfolios?: () => void;
  reviewSummary: NonNullable<GetReviewSummary200['data']> | undefined;
  updates: NonNullable<ListBusinessUpdates200['data']>;
  updatesLoading: boolean;
}

function TabBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/15 px-1 text-[10px] font-medium text-primary">
      {count}
    </span>
  );
}

function AboutTab({
  business,
  hours,
  hoursLoading,
}: Pick<BusinessTabsProps, 'business' | 'hours' | 'hoursLoading'>) {
  const hasDetails =
    business.description ||
    business.addressLine1 ||
    business.primaryEmail ||
    business.websiteUrl;

  return (
    <div className="space-y-6">
      {business.description && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            About
          </h3>
          <p className="text-sm leading-relaxed text-foreground/80">
            {business.description}
          </p>
        </div>
      )}

      {(business.addressLine1 || business.addressLine2) && (
        <div>
          <h3 className="mb-1.5 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Address
          </h3>
          <address className="not-italic text-sm text-foreground/80">
            {business.addressLine1 && <div>{business.addressLine1}</div>}
            {business.addressLine2 && <div>{business.addressLine2}</div>}
          </address>
        </div>
      )}

      {(business.primaryEmail || business.websiteUrl) && (
        <div className="space-y-1">
          <h3 className="mb-1.5 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Contact Details
          </h3>
          {business.primaryEmail && (
            <a
              href={`mailto:${business.primaryEmail}`}
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <Globe className="h-3.5 w-3.5" />
              {business.primaryEmail}
            </a>
          )}
          {business.websiteUrl && (
            <a
              href={
                business.websiteUrl.startsWith('http')
                  ? business.websiteUrl
                  : `https://${business.websiteUrl}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <Globe className="h-3.5 w-3.5" />
              {business.websiteUrl}
            </a>
          )}
        </div>
      )}

      {!hasDetails && !hoursLoading && hours.length === 0 && (
        <div className="py-6 text-center text-sm text-muted-foreground">
          <Info className="mx-auto mb-2 h-6 w-6 opacity-40" />
          No additional information available.
        </div>
      )}

      {(hours.length > 0 || hoursLoading) && (
        <>
          <Separator />
          <div>
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Opening Hours
            </h3>
            <HoursTable hours={hours} isLoading={hoursLoading} />
          </div>
        </>
      )}
    </div>
  );
}

function ReviewsSection({
  businessId,
  reviewSummary,
}: {
  businessId: string;
  reviewSummary: NonNullable<GetReviewSummary200['data']> | undefined;
}) {
  const queryClient = useQueryClient();
  const [sort, setSort] = useState<SortOption>('newest');
  const [ratingFilter, setRatingFilter] = useState<number | undefined>(undefined);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [allReviews, setAllReviews] = useState<ReviewWithResponse[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const isFirstPageRef = useRef(true);

  const { data: meData } = useAuthMe();
  const isAuthenticated = !!(meData as any)?.data;

  const queryKey = getListReviewsQueryKey({
    businessId,
    marketplace: MARKETPLACE_SLUG,
    limit: 20,
    sort: sort as ListReviewsSort,
    rating: ratingFilter,
    cursor,
  });

  const {
    data,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useListReviews(
    {
      businessId,
      marketplace: MARKETPLACE_SLUG,
      limit: 20,
      sort: sort as ListReviewsSort,
      rating: ratingFilter,
      cursor,
    },
    { query: { queryKey } },
  );

  useEffect(() => {
    if (!data?.data) return;
    const newPage = (data.data ?? []) as ReviewWithResponse[];
    if (isFirstPageRef.current) {
      setAllReviews(newPage);
    } else {
      setAllReviews((prev) => {
        const existingIds = new Set(prev.map((r) => r.id));
        return [...prev, ...newPage.filter((r) => !existingIds.has(r.id))];
      });
    }
    setHasMore((data as any)?.pagination?.hasMore ?? false);
  }, [data]);

  function handleSortChange(s: SortOption) {
    isFirstPageRef.current = true;
    setSort(s);
    setCursor(undefined);
    setAllReviews([]);
  }

  function handleRatingFilterChange(r: number | undefined) {
    isFirstPageRef.current = true;
    setRatingFilter(r);
    setCursor(undefined);
    setAllReviews([]);
  }

  function handleLoadMore() {
    const nextCursor = (data as any)?.pagination?.nextCursor as string | null | undefined;
    if (nextCursor) {
      isFirstPageRef.current = false;
      setCursor(nextCursor);
    }
  }

  const userReviewId = isAuthenticated ? (meData as any)?.data?.id : null;
  const hasExistingReview =
    !!userReviewId &&
    allReviews.some((r) => !r.isAnonymous && (r as any).reviewerId === userReviewId);

  return (
    <div className="space-y-5">
      <ReviewSummary summary={reviewSummary} />
      <ReviewList
        reviews={allReviews}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => {
          isFirstPageRef.current = true;
          setCursor(undefined);
          setAllReviews([]);
          refetch();
        }}
        sort={sort}
        onSortChange={handleSortChange}
        ratingFilter={ratingFilter}
        onRatingFilterChange={handleRatingFilterChange}
        isAuthenticated={isAuthenticated}
      />
      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLoadMore}
            disabled={isFetching}
          >
            {isFetching ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Loading…
              </>
            ) : (
              'Load more reviews'
            )}
          </Button>
        </div>
      )}
      <ReviewForm
        businessId={businessId}
        onSuccess={() => {
          isFirstPageRef.current = true;
          setCursor(undefined);
          setAllReviews([]);
          refetch();
          // Invalidate review summary so rating count + average update immediately
          queryClient.invalidateQueries({
            queryKey: getGetReviewSummaryQueryKey({
              businessId,
              marketplace: MARKETPLACE_SLUG,
            }),
          });
        }}
        hasExistingReview={hasExistingReview}
      />
    </div>
  );
}

const TAB_TRIGGER_CLASS =
  'relative rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none';

export function BusinessTabs(props: BusinessTabsProps) {
  const {
    business,
    hours,
    hoursLoading,
    products,
    productsLoading,
    productsError,
    onRetryProducts,
    services,
    servicesLoading,
    servicesError,
    onRetryServices,
    portfolios,
    portfoliosLoading,
    portfoliosError,
    onRetryPortfolios,
    reviewSummary,
    updates,
    updatesLoading,
  } = props;

  return (
    <Tabs defaultValue="about" className="w-full">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <TabsList className="h-auto rounded-none bg-transparent p-0 gap-0 overflow-x-auto flex-nowrap">
            <TabsTrigger value="about" className={TAB_TRIGGER_CLASS}>
              <Info className="mr-1.5 h-3.5 w-3.5" />
              About
            </TabsTrigger>
            <TabsTrigger value="updates" className={TAB_TRIGGER_CLASS}>
              <Rss className="mr-1.5 h-3.5 w-3.5" />
              Updates
              <TabBadge count={updates.length} />
            </TabsTrigger>
            <TabsTrigger value="products" className={TAB_TRIGGER_CLASS}>
              <Package className="mr-1.5 h-3.5 w-3.5" />
              Products
              <TabBadge count={products.length} />
            </TabsTrigger>
            <TabsTrigger value="services" className={TAB_TRIGGER_CLASS}>
              <Scissors className="mr-1.5 h-3.5 w-3.5" />
              Services
              <TabBadge count={services.length} />
            </TabsTrigger>
            <TabsTrigger value="portfolio" className={TAB_TRIGGER_CLASS}>
              <Images className="mr-1.5 h-3.5 w-3.5" />
              Portfolio
              <TabBadge count={portfolios.length} />
            </TabsTrigger>
            <TabsTrigger value="reviews" className={TAB_TRIGGER_CLASS}>
              <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
              Reviews
              <TabBadge count={reviewSummary?.totalCount ?? 0} />
            </TabsTrigger>
          </TabsList>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <TabsContent value="about" className="mt-0">
          <AboutTab
            business={business}
            hours={hours}
            hoursLoading={hoursLoading}
          />
        </TabsContent>

        <TabsContent value="updates" className="mt-0">
          <UpdatesList
            updates={updates as BusinessUpdateItem[]}
            isLoading={updatesLoading}
          />
        </TabsContent>

        <TabsContent value="products" className="mt-0">
          <ProductList
            products={products}
            isLoading={productsLoading}
            isError={productsError}
            onRetry={onRetryProducts}
          />
        </TabsContent>

        <TabsContent value="services" className="mt-0">
          <ServiceList
            services={services}
            isLoading={servicesLoading}
            isError={servicesError}
            onRetry={onRetryServices}
          />
        </TabsContent>

        <TabsContent value="portfolio" className="mt-0">
          <PortfolioGrid
            portfolios={portfolios}
            isLoading={portfoliosLoading}
            isError={portfoliosError}
            onRetry={onRetryPortfolios}
          />
        </TabsContent>

        <TabsContent value="reviews" className="mt-0">
          <ReviewsSection
            businessId={business.id}
            reviewSummary={reviewSummary}
          />
        </TabsContent>
      </div>
    </Tabs>
  );
}
