import { useState } from 'react';
import {
  useAdminAnalyticsSummary,
  useAdminAnalyticsSearch,
  getAdminAnalyticsSummaryQueryKey,
  getAdminAnalyticsSearchQueryKey,
} from '@workspace/api-client-react';
import { MARKETPLACE_SLUG } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Store,
  Star,
  Search,
  MousePointerClick,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

type AnalyticsSummary = {
  marketplace: { id: string; slug: string; name: string };
  businesses: { total: number; active: number };
  reviews: { total: number; avgRating: number | null };
  search: { total: number; zeroResults: number; zeroResultRate: number };
  engagement: { total: number };
};

type SearchAnalytics = {
  topQueries: { query: string; count: number }[];
  zeroResultQueries: { query: string; count: number }[];
  periodDays: number;
};

const PERIOD_OPTIONS = [
  { label: 'Last 7 days', value: 7 },
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 90 days', value: 90 },
];

export default function AdminAnalyticsPage() {
  const [periodDays, setPeriodDays] = useState(30);

  const summaryParams = { marketplace: MARKETPLACE_SLUG };
  const searchParams = { marketplace: MARKETPLACE_SLUG, days: periodDays };

  const {
    data: summaryData,
    isLoading: summaryLoading,
    isError: summaryError,
    refetch: refetchSummary,
  } = useAdminAnalyticsSummary(summaryParams, {
    query: { queryKey: getAdminAnalyticsSummaryQueryKey(summaryParams) },
  });

  const {
    data: searchData,
    isLoading: searchLoading,
    isError: searchError,
    refetch: refetchSearch,
  } = useAdminAnalyticsSearch(searchParams, {
    query: { queryKey: getAdminAnalyticsSearchQueryKey(searchParams) },
  });

  const summary = (summaryData as any) as AnalyticsSummary | undefined;
  const searchAnalytics = (searchData as any) as SearchAnalytics | undefined;

  const summaryCards = summary
    ? [
        {
          icon: Store,
          label: 'Total Businesses',
          value: summary.businesses.total,
          sub: `${summary.businesses.active} active (${summary.businesses.total > 0 ? Math.round((summary.businesses.active / summary.businesses.total) * 100) : 0}%)`,
        },
        {
          icon: Star,
          label: 'Reviews',
          value: summary.reviews.total,
          sub: summary.reviews.avgRating != null ? `${summary.reviews.avgRating.toFixed(2)} avg rating` : 'No ratings yet',
        },
        {
          icon: Search,
          label: 'Total Searches',
          value: summary.search.total,
          sub: `${summary.search.zeroResults} zero-result (${(summary.search.zeroResultRate * 100).toFixed(1)}%)`,
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
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Marketplace performance metrics and search insights.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Overview</h2>
        {summaryError ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed bg-muted/20 px-6 py-10 text-center">
            <AlertCircle className="h-7 w-7 text-destructive/60" />
            <p className="text-sm text-muted-foreground">Failed to load analytics summary.</p>
            <Button variant="outline" size="sm" onClick={() => refetchSummary()}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Try again
            </Button>
          </div>
        ) : summaryLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {summaryCards.map(({ icon: Icon, label, value, sub }) => (
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
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Growth Trends</h2>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Business &amp; Review Activity</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {summaryError ? (
              <div className="flex h-44 items-center justify-center">
                <p className="text-sm text-muted-foreground">Error loading data.</p>
              </div>
            ) : summaryLoading ? (
              <Skeleton className="h-44 w-full rounded-lg" />
            ) : (
              <div className="relative">
                <ResponsiveContainer width="100%" height={176}>
                  <AreaChart data={[]} margin={{ top: 8, right: 16, bottom: 0, left: -10 }}>
                    <defs>
                      <linearGradient id="colorBiz" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="hsl(var(--primary))"
                      fill="url(#colorBiz)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg bg-background/80">
                  <TrendingUp className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Historical growth data not yet available.</p>
                  <p className="text-xs text-muted-foreground/60">
                    Data collection begins once your marketplace goes live.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Search Insights</h2>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                Last {periodDays} days
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {PERIOD_OPTIONS.map(({ label, value }) => (
                <DropdownMenuItem
                  key={value}
                  onClick={() => setPeriodDays(value)}
                  className={periodDays === value ? 'font-medium text-primary' : ''}
                >
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {searchError ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed bg-muted/20 px-6 py-10 text-center">
            <AlertCircle className="h-7 w-7 text-destructive/60" />
            <p className="text-sm text-muted-foreground">Failed to load search analytics.</p>
            <Button variant="outline" size="sm" onClick={() => refetchSearch()}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Try again
            </Button>
          </div>
        ) : searchLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-semibold">Top Queries</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {(searchAnalytics?.topQueries ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No search data for this period.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={(searchAnalytics?.topQueries ?? []).slice(0, 8)}
                      layout="vertical"
                      margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis
                        type="category"
                        dataKey="query"
                        width={96}
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v: string) => (v.length > 14 ? v.slice(0, 14) + '…' : v)}
                      />
                      <Tooltip
                        formatter={(value: number) => [value.toLocaleString(), 'Searches']}
                        labelStyle={{ fontSize: 11 }}
                        itemStyle={{ fontSize: 11 }}
                      />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 3, 3, 0]} maxBarSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-destructive/70" />
                  <CardTitle className="text-sm font-semibold">Zero-Result Queries</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {(searchAnalytics?.zeroResultQueries ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No zero-result queries in this period.</p>
                ) : (
                  <ol className="space-y-2">
                    {(searchAnalytics?.zeroResultQueries ?? []).slice(0, 10).map(({ query, count }, i) => (
                      <li key={query} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 shrink-0 text-xs tabular-nums text-muted-foreground/60">{i + 1}</span>
                          <span className="truncate text-sm text-destructive/80">{query}</span>
                        </div>
                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{count.toLocaleString()}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </section>
    </div>
  );
}
