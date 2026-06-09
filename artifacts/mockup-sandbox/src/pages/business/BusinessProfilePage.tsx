import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  useGetBusiness,
  useGetBusinessHours,
  useListBusinessContacts,
  useListProducts,
  useListServices,
  useListPortfolios,
  useListReviews,
  useGetReviewSummary,
  useListBusinessUpdates,
  useTrackEngagementEvent,
} from '@workspace/api-client-react';
import type {
  GetBusiness200,
  GetBusinessHours200,
  ListBusinessContacts200,
  ListProducts200,
  ListServices200,
  GetReviewSummary200,
  ListBusinessUpdates200,
} from '@workspace/api-client-react';
import { BusinessHero, BusinessHeroSkeleton } from '@/components/business-profile/BusinessHero';
import { ContactButtons } from '@/components/business-profile/ContactButtons';
import { BusinessTabs } from '@/components/business-profile/BusinessTabs';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft, Store } from 'lucide-react';
import { MARKETPLACE_SLUG } from '@/lib/constants';

type BusinessDetail = NonNullable<GetBusiness200['data']>;

function BusinessNotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Store className="h-8 w-8 text-muted-foreground/40" />
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-bold">Business Not Found</h1>
        <p className="text-sm text-muted-foreground">
          This business doesn&apos;t exist or may have been removed.
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" asChild size="sm">
          <Link to="/directory">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Browse Directory
          </Link>
        </Button>
        <Button asChild size="sm">
          <Link to="/">Go Home</Link>
        </Button>
      </div>
    </div>
  );
}

function BusinessProfileError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center">
      <AlertCircle className="h-10 w-10 text-destructive/50" />
      <p className="text-sm font-medium text-destructive">
        Failed to load business profile
      </p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Try Again
      </Button>
    </div>
  );
}

function ProfileLoadingSkeleton() {
  return (
    <div className="min-h-screen pb-16">
      <BusinessHeroSkeleton />
      <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6">
        <div className="flex flex-wrap gap-2">
          <div className="h-9 w-28 animate-pulse rounded-lg bg-muted" />
          <div className="h-9 w-20 animate-pulse rounded-lg bg-muted" />
          <div className="h-9 w-24 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
      <div className="border-b">
        <div className="mx-auto max-w-5xl flex gap-1 px-4 py-0.5 sm:px-6">
          {['About', 'Updates', 'Products', 'Services', 'Portfolio', 'Reviews'].map((t) => (
            <div key={t} className="h-10 w-20 animate-pulse rounded bg-muted" />
          ))}
        </div>
      </div>
      <div className="mx-auto max-w-5xl space-y-3 px-4 py-6 sm:px-6">
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

function BusinessProfileContent({ business }: { business: BusinessDetail }) {
  const { mutate: trackEvent } = useTrackEngagementEvent();

  useEffect(() => {
    try {
      trackEvent({
        data: { entityType: 'business', entityId: business.id, eventType: 'view' },
        params: { marketplace: MARKETPLACE_SLUG },
      });
    } catch {
      // Engagement tracking failures must never break page rendering
    }
  }, [business.id]);

  const { data: hoursData, isLoading: hoursLoading } = useGetBusinessHours(
    business.id,
    { marketplace: MARKETPLACE_SLUG },
  );

  const { data: contactsData } = useListBusinessContacts(business.id, {
    marketplace: MARKETPLACE_SLUG,
  });

  const { data: productsData, isLoading: productsLoading } = useListProducts(
    business.id,
    { marketplace: MARKETPLACE_SLUG, limit: 20 },
  );

  const { data: servicesData, isLoading: servicesLoading } = useListServices(
    business.id,
    { marketplace: MARKETPLACE_SLUG, limit: 20 },
  );

  const { data: portfoliosData, isLoading: portfoliosLoading } = useListPortfolios(
    business.id,
    { marketplace: MARKETPLACE_SLUG },
  );

  const { data: reviewsData, isLoading: reviewsLoading } = useListReviews({
    businessId: business.id,
    marketplace: MARKETPLACE_SLUG,
    limit: 10,
  });

  const { data: reviewSummaryData } = useGetReviewSummary({
    businessId: business.id,
    marketplace: MARKETPLACE_SLUG,
  });

  const { data: updatesData, isLoading: updatesLoading } = useListBusinessUpdates(
    business.id,
    { marketplace: MARKETPLACE_SLUG, limit: 20 },
  );

  const hours = (hoursData as GetBusinessHours200 | undefined)?.data ?? [];
  const contacts = (contactsData as ListBusinessContacts200 | undefined)?.data ?? [];
  const products = (productsData as ListProducts200 | undefined)?.data ?? [];
  const services = (servicesData as ListServices200 | undefined)?.data ?? [];
  const portfolios = (portfoliosData?.data ?? []) as Record<string, unknown>[];
  const reviews = reviewsData?.data ?? [];
  const reviewSummary = (reviewSummaryData as GetReviewSummary200 | undefined)?.data;
  const updates = (updatesData as ListBusinessUpdates200 | undefined)?.data ?? [];

  return (
    <div className="min-h-screen pb-16">
      <BusinessHero business={business} reviewSummary={reviewSummary} />
      <ContactButtons business={business} contacts={contacts} />
      <BusinessTabs
        business={business}
        hours={hours}
        hoursLoading={hoursLoading}
        contacts={contacts}
        products={products}
        productsLoading={productsLoading}
        services={services}
        servicesLoading={servicesLoading}
        portfolios={portfolios}
        portfoliosLoading={portfoliosLoading}
        reviews={reviews}
        reviewsLoading={reviewsLoading}
        reviewSummary={reviewSummary}
        updates={updates}
        updatesLoading={updatesLoading}
      />
    </div>
  );
}

export default function BusinessProfilePage() {
  const { slug } = useParams<{ slug: string }>();

  const { data, isLoading, isError, error, refetch } = useGetBusiness(slug!, {
    marketplace: MARKETPLACE_SLUG,
  });

  const is404 =
    isError && (error as { status?: number })?.status === 404;

  if (is404) return <BusinessNotFound />;
  if (isLoading) return <ProfileLoadingSkeleton />;
  if (isError) return <BusinessProfileError onRetry={refetch} />;

  const business = data?.data;
  if (!business) return <BusinessNotFound />;

  return <BusinessProfileContent business={business} />;
}
