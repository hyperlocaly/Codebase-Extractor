import { Link } from 'react-router-dom';
import {
  useGetBusiness,
  useGetReviewSummary,
  useListProducts,
  useListServices,
} from '@workspace/api-client-react';
import { useDashboard } from '@/providers/DashboardProvider';
import { MARKETPLACE_SLUG } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Store,
  Clock,
  Phone,
  Star,
  Package,
  Wrench,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  draft: 'secondary',
  suspended: 'destructive',
};

export default function DashboardPage() {
  const { business, businessId, businessSlug } = useDashboard();

  const { data: bizData, isLoading: bizLoading, isError: bizError, refetch: refetchBiz } = useGetBusiness(
    businessSlug ?? '',
    { marketplace: MARKETPLACE_SLUG },
    { query: { enabled: !!businessSlug, queryKey: ['getBusiness', businessSlug] } },
  );

  const { data: reviewData } = useGetReviewSummary(
    { businessId: businessId ?? '', marketplace: MARKETPLACE_SLUG },
    { query: { enabled: !!businessId, queryKey: ['reviewSummary', businessId] } },
  );

  const { data: productsData } = useListProducts(
    businessId ?? '',
    { marketplace: MARKETPLACE_SLUG, limit: 100 },
    { query: { enabled: !!businessId, queryKey: ['listProducts', businessId] } },
  );

  const { data: servicesData } = useListServices(
    businessId ?? '',
    { marketplace: MARKETPLACE_SLUG, limit: 100 },
    { query: { enabled: !!businessId, queryKey: ['listServices', businessId] } },
  );

  const detail = bizData?.data;
  const status = business?.status ?? 'draft';
  const avgRating = reviewData?.data?.avgRating;
  const totalReviews = reviewData?.data?.totalCount ?? 0;
  const productCount = productsData?.data?.length ?? 0;
  const serviceCount = servicesData?.data?.length ?? 0;

  const quickActions = [
    {
      to: '/dashboard/profile',
      icon: Store,
      title: 'Business Profile',
      description: 'Update your name, description, and location',
    },
    {
      to: '/dashboard/hours',
      icon: Clock,
      title: 'Opening Hours',
      description: 'Set your weekly opening schedule',
    },
    {
      to: '/dashboard/contacts',
      icon: Phone,
      title: 'Contacts',
      description: 'Manage phones, emails, and social links',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          {bizLoading ? (
            <>
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-5 w-32" />
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{detail?.name ?? business?.name}</h1>
                <Badge variant={STATUS_VARIANT[status] ?? 'outline'} className="capitalize">
                  {status}
                </Badge>
                {(business?.verificationScore ?? 0) > 0 && (
                  <ShieldCheck className="h-5 w-5 text-green-500" />
                )}
              </div>
              {detail?.tagline && (
                <p className="text-muted-foreground">{detail.tagline}</p>
              )}
            </>
          )}
        </div>
        {businessSlug && (
          <Button variant="outline" size="sm" asChild>
            <a href={`/business/${businessSlug}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              View public listing
            </a>
          </Button>
        )}
      </div>

      {bizError && businessSlug && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">Failed to load business details.</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() => void refetchBiz()}
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Reviews</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {totalReviews > 0 ? totalReviews : '—'}
            </p>
            {avgRating != null && (
              <p className="text-xs text-muted-foreground">{avgRating.toFixed(1)} avg rating</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{productCount}</p>
            <p className="text-xs text-muted-foreground">active products</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Services</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{serviceCount}</p>
            <p className="text-xs text-muted-foreground">active services</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {quickActions.map(({ to, icon: Icon, title, description }) => (
            <Link key={to} to={to}>
              <Card className="cursor-pointer transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-md bg-primary/10 p-2">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{title}</p>
                      <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {detail?.categories && detail.categories.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Categories</h2>
          <div className="flex flex-wrap gap-2">
            {detail.categories.map((cat) => (
              <Badge key={cat.id} variant="outline">
                {cat.name}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
