import { Link } from 'react-router-dom';
import {
  useAdminAnalyticsSummary,
  getAdminAnalyticsSummaryQueryKey,
} from '@workspace/api-client-react';
import { MARKETPLACE_SLUG } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Store,
  Star,
  Search,
  MousePointerClick,
  ClipboardList,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

type AnalyticsSummary = {
  marketplace: { id: string; slug: string; name: string };
  businesses: { total: number; active: number };
  reviews: { total: number; avgRating: number | null };
  search: { total: number; zeroResults: number; zeroResultRate: number };
  engagement: { total: number };
};

const NAV_CARDS = [
  {
    to: '/admin/businesses',
    icon: Store,
    title: 'Businesses',
    description: 'View, search, and moderate all businesses',
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-950',
  },
  {
    to: '/admin/claims',
    icon: ClipboardList,
    title: 'Claim Requests',
    description: 'Review and resolve business ownership claims',
    color: 'text-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-950',
  },
  {
    to: '/admin/reviews',
    icon: ShieldCheck,
    title: 'Review Moderation',
    description: 'Moderate reviews and resolve reports',
    color: 'text-purple-600',
    bg: 'bg-purple-50 dark:bg-purple-950',
  },
  {
    to: '/admin/analytics',
    icon: Search,
    title: 'Analytics',
    description: 'Marketplace performance and search insights',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 dark:bg-emerald-950',
  },
];

export default function AdminDashboardPage() {
  const params = { marketplace: MARKETPLACE_SLUG };
  const { data, isLoading, isError, refetch } = useAdminAnalyticsSummary(params, {
    query: { queryKey: getAdminAnalyticsSummaryQueryKey(params) },
  });

  const summary = (data as any) as AnalyticsSummary | undefined;

  const stats = summary
    ? [
        {
          icon: Store,
          label: 'Total Businesses',
          value: summary.businesses.total,
          sub: `${summary.businesses.active} active`,
        },
        {
          icon: Star,
          label: 'Reviews',
          value: summary.reviews.total,
          sub: summary.reviews.avgRating != null ? `${summary.reviews.avgRating.toFixed(1)} avg` : undefined,
        },
        {
          icon: Search,
          label: 'Searches',
          value: summary.search.total,
          sub: `${(summary.search.zeroResultRate * 100).toFixed(1)}% zero-result`,
        },
        {
          icon: MousePointerClick,
          label: 'Engagement Events',
          value: summary.engagement.total,
        },
      ]
    : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          {summary?.marketplace.name ?? MARKETPLACE_SLUG} — marketplace overview
        </p>
      </div>

      {isError ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed bg-muted/20 px-6 py-10 text-center">
          <AlertCircle className="h-7 w-7 text-destructive/60" />
          <p className="text-sm text-muted-foreground">Failed to load analytics summary.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Try again
          </Button>
        </div>
      ) : isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(({ icon: Icon, label, value, sub }) => (
            <Card key={label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{value.toLocaleString()}</p>
                {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div>
        <h2 className="mb-4 text-lg font-semibold">Quick Links</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {NAV_CARDS.map(({ to, icon: Icon, title, description, color, bg }) => (
            <Link key={to} to={to}>
              <Card className="cursor-pointer transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${bg}`}>
                    <Icon className={`h-5 w-5 ${color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{title}</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
