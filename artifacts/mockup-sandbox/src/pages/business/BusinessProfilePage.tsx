import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetBusiness,
  useGetBusinessHours,
  useListBusinessContacts,
  useListProducts,
  useListServices,
  useListPortfolios,
  useGetReviewSummary,
  useListBusinessUpdates,
  useTrackEngagementEvent,
  useListSavedItems,
  useSaveItem,
  useRemoveSavedItem,
  useCreateClaimRequest,
  getListSavedItemsQueryKey,
  getGetBusinessQueryKey,
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
import { useAuth } from '@/providers/AuthProvider';
import { BusinessHero, BusinessHeroSkeleton } from '@/components/business-profile/BusinessHero';
import { ContactButtons } from '@/components/business-profile/ContactButtons';
import { BusinessTabs } from '@/components/business-profile/BusinessTabs';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertCircle, ArrowLeft, Bookmark, BookmarkCheck, FileCheck, Loader2, Store } from 'lucide-react';
import { MARKETPLACE_SLUG } from '@/lib/constants';
import { toast } from 'sonner';

type BusinessDetail = NonNullable<GetBusiness200['data']>;

interface SavedItem {
  id: string;
  entityType: string;
  entityId: string;
}

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
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="h-8 w-8 text-destructive/60" />
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-bold">Something Went Wrong</h1>
        <p className="text-sm text-muted-foreground">
          We couldn&apos;t load this business profile. Please try again.
        </p>
      </div>
      <Button onClick={onRetry} size="sm">
        Try Again
      </Button>
    </div>
  );
}

function ProfileLoadingSkeleton() {
  return (
    <div className="min-h-screen">
      <BusinessHeroSkeleton />
      <div className="mx-auto max-w-5xl animate-pulse px-4 py-8 sm:px-6">
        <div className="space-y-3">
          <div className="h-10 w-full max-w-lg rounded bg-muted" />
          <div className="h-4 w-40 rounded bg-muted" />
          <div className="h-4 w-64 rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}

function BusinessActionBar({ business }: { business: BusinessDetail }) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUnsaving, setIsUnsaving] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  const savedItemsParams = { marketplace: MARKETPLACE_SLUG, limit: 100 };
  const { data: savedData } = useListSavedItems(savedItemsParams, {
    query: {
      queryKey: getListSavedItemsQueryKey(savedItemsParams),
      enabled: isAuthenticated,
    },
  });

  const saveItem = useSaveItem();
  const removeSavedItem = useRemoveSavedItem();
  const createClaim = useCreateClaimRequest();

  const savedItems = ((savedData as any)?.data ?? []) as SavedItem[];
  const existingSave = savedItems.find(
    (s) => s.entityType === 'business' && s.entityId === business.id,
  );
  const isSaved = !!existingSave;

  const canClaim =
    isAuthenticated &&
    (!business.claimStatus || business.claimStatus === 'unclaimed');

  // Use base key prefix to bust ALL saved-items queries regardless of params
  const SAVED_BASE_KEY = '/api/v1/saved-items';

  async function handleSave() {
    setIsSaving(true);
    try {
      await saveItem.mutateAsync({
        data: { entityType: 'business', entityId: business.id },
        params: { marketplace: MARKETPLACE_SLUG },
      });
      queryClient.invalidateQueries({ queryKey: [SAVED_BASE_KEY] });
      toast.success('Business saved to your list.');
    } catch (err: any) {
      if (err?.status === 409) {
        toast.info('Already in your saved list.');
        queryClient.invalidateQueries({ queryKey: [SAVED_BASE_KEY] });
      } else {
        toast.error('Failed to save. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUnsave() {
    if (!existingSave) return;
    setIsUnsaving(true);
    try {
      await removeSavedItem.mutateAsync({
        id: existingSave.id,
        params: { marketplace: MARKETPLACE_SLUG },
      });
      queryClient.invalidateQueries({ queryKey: [SAVED_BASE_KEY] });
      toast.success('Removed from saved items.');
    } catch {
      toast.error('Failed to unsave. Please try again.');
    } finally {
      setIsUnsaving(false);
    }
  }

  async function handleClaim() {
    setClaimDialogOpen(false);
    setIsClaiming(true);
    try {
      await createClaim.mutateAsync({
        data: { businessId: business.id },
        params: { marketplace: MARKETPLACE_SLUG },
      });
      toast.success("Claim request submitted. We'll review it shortly.");
      queryClient.invalidateQueries({ queryKey: getGetBusinessQueryKey(business.slug, { marketplace: MARKETPLACE_SLUG }) });
    } catch (err: any) {
      if (err?.status === 409) {
        toast.info("You've already submitted a claim request for this business.");
      } else {
        toast.error('Failed to submit claim. Please try again.');
      }
    } finally {
      setIsClaiming(false);
    }
  }

  if (!isAuthenticated) return null;

  return (
    <>
      <div className="mx-auto max-w-5xl px-4 pt-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          {isSaved ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleUnsave}
              disabled={isUnsaving}
              className="gap-2 text-primary border-primary/30 hover:border-primary/60"
            >
              {isUnsaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <BookmarkCheck className="h-3.5 w-3.5" />
              )}
              Saved
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="gap-2"
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Bookmark className="h-3.5 w-3.5" />
              )}
              Save
            </Button>
          )}

          {canClaim && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setClaimDialogOpen(true)}
              disabled={isClaiming}
              className="gap-2"
            >
              {isClaiming ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileCheck className="h-3.5 w-3.5" />
              )}
              Claim Business
            </Button>
          )}
        </div>
      </div>

      <Dialog open={claimDialogOpen} onOpenChange={setClaimDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Claim this business?</DialogTitle>
            <DialogDescription>
              You're claiming ownership of <strong>{business.name}</strong>. We'll review your
              request and notify you once it's processed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClaimDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleClaim}>Submit Claim</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function BusinessProfileContent({ business }: { business: BusinessDetail }) {
  const trackEvent = useTrackEngagementEvent();

  useEffect(() => {
    trackEvent.mutate({
      data: {
        entityType: 'business',
        entityId: business.id,
        eventType: 'view',
      },
      params: { marketplace: MARKETPLACE_SLUG },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business.id]);

  const { data: hoursData, isLoading: hoursLoading } = useGetBusinessHours(business.id, {
    marketplace: MARKETPLACE_SLUG,
  });

  const { data: contactsData } = useListBusinessContacts(business.id, {
    marketplace: MARKETPLACE_SLUG,
  });

  const {
    data: productsData,
    isLoading: productsLoading,
    isError: productsError,
    refetch: refetchProducts,
  } = useListProducts(
    business.id,
    { marketplace: MARKETPLACE_SLUG, limit: 20 },
  );

  const {
    data: servicesData,
    isLoading: servicesLoading,
    isError: servicesError,
    refetch: refetchServices,
  } = useListServices(
    business.id,
    { marketplace: MARKETPLACE_SLUG, limit: 20 },
  );

  const {
    data: portfoliosData,
    isLoading: portfoliosLoading,
    isError: portfoliosError,
    refetch: refetchPortfolios,
  } = useListPortfolios(
    business.id,
    { marketplace: MARKETPLACE_SLUG },
  );

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
  const portfolios = portfoliosData?.data ?? [];
  const reviewSummary = (reviewSummaryData as GetReviewSummary200 | undefined)?.data;
  const updates = (updatesData as ListBusinessUpdates200 | undefined)?.data ?? [];

  return (
    <div className="min-h-screen pb-16">
      <BusinessHero business={business} reviewSummary={reviewSummary} />
      <BusinessActionBar business={business} />
      <ContactButtons business={business} contacts={contacts} />
      <BusinessTabs
        business={business}
        hours={hours}
        hoursLoading={hoursLoading}
        contacts={contacts}
        products={products}
        productsLoading={productsLoading}
        productsError={productsError}
        onRetryProducts={refetchProducts}
        services={services}
        servicesLoading={servicesLoading}
        servicesError={servicesError}
        onRetryServices={refetchServices}
        portfolios={portfolios}
        portfoliosLoading={portfoliosLoading}
        portfoliosError={portfoliosError}
        onRetryPortfolios={refetchPortfolios}
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
