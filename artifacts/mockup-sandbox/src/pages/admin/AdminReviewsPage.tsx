import { useState } from 'react';
import {
  useAdminListReviews,
  useAdminListReports,
  useAdminModerateReview,
  useAdminResolveReport,
  AdminModerateReviewBodyModerationStatus,
} from '@workspace/api-client-react';
import { ShieldAlert, Eye, EyeOff, RefreshCw, AlertCircle, CheckCircle2, XCircle, ChevronDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MARKETPLACE_SLUG } from '@/lib/constants';
import { Stars } from '@/components/business-profile/ReviewSummary';

function timeAgo(date: string | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function ModerationStatusBadge({ status }: { status: string }) {
  if (status === 'removed') return <Badge variant="destructive">Hidden</Badge>;
  if (status === 'flagged') return <Badge variant="outline" className="border-amber-400 text-amber-600">Flagged</Badge>;
  return <Badge variant="secondary" className="text-green-700 bg-green-50 dark:bg-green-950 dark:text-green-300">Approved</Badge>;
}

function ReviewStatusBadge({ status }: { status: string }) {
  if (status === 'hidden') return <Badge variant="destructive">Hidden</Badge>;
  if (status === 'published') return <Badge variant="secondary" className="text-green-700">Published</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

function ReviewModerationCard({ review, onRefetch }: { review: any; onRefetch: () => void }) {
  const { mutate: moderate, isPending } = useAdminModerateReview();

  function setModerationStatus(status: string) {
    moderate(
      {
        id: review.id,
        params: { marketplace: MARKETPLACE_SLUG },
        data: {
          moderationStatus: status as AdminModerateReviewBodyModerationStatus,
        },
      },
      { onSuccess: onRefetch },
    );
  }

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Stars value={review.rating ?? 0} size="sm" />
            <span className="text-xs font-medium">{review.rating}/5</span>
            <ModerationStatusBadge status={review.moderationStatus ?? 'auto_approved'} />
            <ReviewStatusBadge status={review.status ?? 'published'} />
            {review.pendingReports > 0 && (
              <Badge variant="destructive" className="gap-1">
                <ShieldAlert className="h-3 w-3" />
                {review.pendingReports} report{review.pendingReports !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {review.reviewer?.displayName ?? 'Unknown'} · {review.business?.name} · {timeAgo(review.createdAt)}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" disabled={isPending}>
              Actions
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {review.moderationStatus !== 'auto_approved' && (
              <DropdownMenuItem onClick={() => setModerationStatus('auto_approved')} className="text-green-700">
                <Eye className="mr-2 h-3.5 w-3.5" />
                Restore (approve)
              </DropdownMenuItem>
            )}
            {review.moderationStatus !== 'flagged' && (
              <DropdownMenuItem onClick={() => setModerationStatus('flagged')} className="text-amber-600">
                <ShieldAlert className="mr-2 h-3.5 w-3.5" />
                Flag for review
              </DropdownMenuItem>
            )}
            {review.moderationStatus !== 'removed' && (
              <DropdownMenuItem onClick={() => setModerationStatus('removed')} className="text-destructive">
                <EyeOff className="mr-2 h-3.5 w-3.5" />
                Hide review
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {review.title && <p className="text-sm font-medium">{review.title}</p>}
      {review.body && <p className="text-sm text-muted-foreground line-clamp-3">{review.body}</p>}
      {review.moderationNote && (
        <p className="text-xs text-muted-foreground italic border-l-2 pl-2">Note: {review.moderationNote}</p>
      )}
    </div>
  );
}

function ReportCard({ report, onRefetch }: { report: any; onRefetch: () => void }) {
  const { mutate: resolve, isPending } = useAdminResolveReport();

  function handleResolve(status: 'resolved' | 'rejected') {
    resolve(
      {
        id: report.id,
        params: { marketplace: MARKETPLACE_SLUG },
        data: { status },
      },
      { onSuccess: onRefetch },
    );
  }

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            {report.status === 'pending' ? (
              <Badge variant="secondary">Pending</Badge>
            ) : report.status === 'resolved' ? (
              <Badge variant="outline" className="text-green-700 border-green-400">Resolved</Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">Rejected</Badge>
            )}
            <span className="text-xs text-muted-foreground">
              Reported by {report.reporter?.displayName ?? 'Unknown'} · {timeAgo(report.createdAt)}
            </span>
          </div>
          <p className="text-xs font-medium">{report.business?.name}</p>
        </div>
        {report.status === 'pending' && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs"
              onClick={() => handleResolve('resolved')}
              disabled={isPending}
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
              Resolve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs"
              onClick={() => handleResolve('rejected')}
              disabled={isPending}
            >
              <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
              Reject
            </Button>
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Reason: </span>
        {report.reason}
      </p>
      {report.review && (
        <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1 mb-1">
            <Stars value={report.review.rating ?? 0} size="sm" />
          </div>
          {report.review.body && (
            <p className="line-clamp-2">{report.review.body}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminReviewsPage() {
  const [modStatus, setModStatus] = useState<string | undefined>(undefined);
  const [searchQ, setSearchQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');

  function handleSearchChange(value: string) {
    setSearchQ(value);
    const timer = setTimeout(() => setDebouncedQ(value), 400);
    return () => clearTimeout(timer);
  }

  const reviewParams = {
    marketplace: MARKETPLACE_SLUG,
    moderationStatus: modStatus,
    limit: 50,
    ...(debouncedQ ? { q: debouncedQ } : {}),
  };

  const {
    data: reviewsData,
    isLoading: reviewsLoading,
    isError: reviewsError,
    refetch: refetchReviews,
  } = useAdminListReviews(reviewParams);

  const {
    data: reportsData,
    isLoading: reportsLoading,
    isError: reportsError,
    refetch: refetchReports,
  } = useAdminListReports({
    marketplace: MARKETPLACE_SLUG,
    status: 'pending',
    limit: 50,
  });

  const reviews = reviewsData?.data ?? [];
  const reports = reportsData?.data ?? [];
  const pendingReports = reports.length;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-xl font-bold">Review Moderation</h1>
        <p className="text-sm text-muted-foreground">Monitor, moderate, and manage customer reviews.</p>
      </div>

      <Tabs defaultValue="reviews">
        <TabsList>
          <TabsTrigger value="reviews">All Reviews</TabsTrigger>
          <TabsTrigger value="reports" className="relative">
            Reports
            {pendingReports > 0 && (
              <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
                {pendingReports}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reviews" className="mt-4 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQ}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search by business name or reviewer…"
                className="pl-9"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs shrink-0">
                  {modStatus === 'removed' ? 'Hidden only'
                    : modStatus === 'flagged' ? 'Flagged only'
                    : modStatus === 'auto_approved' ? 'Approved only'
                    : 'All statuses'}
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setModStatus(undefined)}>All statuses</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setModStatus('auto_approved')}>Approved only</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setModStatus('flagged')}>Flagged only</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setModStatus('removed')}>Hidden only</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {reviewsError ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed py-10 text-center">
              <AlertCircle className="h-7 w-7 text-destructive/50" />
              <p className="text-sm text-muted-foreground">Failed to load reviews.</p>
              <Button variant="outline" size="sm" onClick={() => refetchReviews()}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Try again
              </Button>
            </div>
          ) : reviewsLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl border bg-muted" />
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed py-12 text-center">
              <ShieldAlert className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {debouncedQ ? `No reviews found matching "${debouncedQ}".` : 'No reviews to moderate.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((r: any) => (
                <ReviewModerationCard key={r.id} review={r} onRefetch={() => refetchReviews()} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reports" className="mt-4 space-y-4">
          {reportsError ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed py-10 text-center">
              <AlertCircle className="h-7 w-7 text-destructive/50" />
              <p className="text-sm text-muted-foreground">Failed to load reports.</p>
              <Button variant="outline" size="sm" onClick={() => refetchReports()}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Try again
              </Button>
            </div>
          ) : reportsLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl border bg-muted" />
              ))}
            </div>
          ) : reports.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed py-12 text-center">
              <CheckCircle2 className="h-8 w-8 text-green-500/40" />
              <p className="text-sm text-muted-foreground">No pending reports. All clear!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((r: any) => (
                <ReportCard key={r.id} report={r} onRefetch={() => refetchReports()} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
