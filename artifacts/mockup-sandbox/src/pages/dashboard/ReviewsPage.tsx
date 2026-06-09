import { useState, useEffect, useRef } from 'react';
import {
  useListReviews,
  useGetReviewSummary,
  useCreateReviewResponse,
  useUpdateReviewResponse,
  useDeleteReviewResponse,
  getListReviewsQueryKey,
  getGetReviewSummaryQueryKey,
  ListReviewsSort,
} from '@workspace/api-client-react';
import { useDashboard } from '@/providers/DashboardProvider';
import type { ReviewSummary as ReviewSummaryType, ReviewResponse } from '@workspace/api-client-react';
import { Star, MessageSquare, RefreshCw, AlertCircle, Send, Pencil, Trash2, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MARKETPLACE_SLUG } from '@/lib/constants';
import { Stars } from '@/components/business-profile/ReviewSummary';

const PAGE_LIMIT = 20;

type ReviewWithResponse = ReviewSummaryType & { ownerResponse?: ReviewResponse | null };

function timeAgo(date: Date | string | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) !== 1 ? 's' : ''} ago`;
  if (days < 365) return `${Math.floor(days / 30)} month${Math.floor(days / 30) !== 1 ? 's' : ''} ago`;
  return `${Math.floor(days / 365)} year${Math.floor(days / 365) !== 1 ? 's' : ''} ago`;
}

function AnalyticsCard({
  avg,
  total,
  distribution,
}: {
  avg: number | null;
  total: number;
  distribution?: Record<string, number>;
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <h2 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Rating overview
      </h2>
      <div className="flex gap-6">
        <div className="flex flex-col items-center gap-1">
          <span className="text-4xl font-bold leading-none">{avg?.toFixed(1) ?? '—'}</span>
          <Stars value={avg ?? 0} size="sm" />
          <span className="text-xs text-muted-foreground">{total} review{total !== 1 ? 's' : ''}</span>
        </div>
        {distribution && total > 0 && (
          <div className="flex-1 space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const c = distribution[String(star)] ?? 0;
              const pct = total > 0 ? Math.round((c / total) * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-2">
                  <span className="w-3 text-right text-xs tabular-nums text-muted-foreground">{star}</span>
                  <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-6 text-right text-xs tabular-nums text-muted-foreground">{c}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ResponseEditor({
  reviewId,
  existing,
  onDone,
}: {
  reviewId: string;
  existing?: ReviewResponse | null;
  onDone: () => void;
}) {
  const [text, setText] = useState(existing?.response ?? '');
  const { mutate: create, isPending: creating } = useCreateReviewResponse();
  const { mutate: update, isPending: updating } = useUpdateReviewResponse();
  const isPending = creating || updating;

  function submit() {
    if (!text.trim()) return;
    if (existing) {
      update(
        {
          id: reviewId,
          responseId: existing.id,
          params: { marketplace: MARKETPLACE_SLUG },
          data: { response: text.trim() },
        },
        { onSuccess: onDone },
      );
    } else {
      create(
        {
          id: reviewId,
          params: { marketplace: MARKETPLACE_SLUG },
          data: { response: text.trim() },
        },
        { onSuccess: onDone },
      );
    }
  }

  return (
    <div className="mt-3 space-y-2">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write your response…"
        rows={3}
        maxLength={2000}
        className="text-sm"
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={submit} disabled={isPending || !text.trim()}>
          <Send className="mr-1.5 h-3.5 w-3.5" />
          {isPending ? 'Saving…' : existing ? 'Update response' : 'Post response'}
        </Button>
        <Button size="sm" variant="outline" onClick={onDone} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function ReviewRow({
  review,
  onRefetch,
}: {
  review: ReviewWithResponse;
  onRefetch: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { mutate: deleteResponse, isPending: deleting } = useDeleteReviewResponse();

  const resp = review.ownerResponse;
  const displayName = review.isAnonymous ? 'Anonymous' : (review.reviewerName ?? 'Customer');

  function handleDeleteResponse() {
    if (!resp) return;
    deleteResponse(
      {
        id: review.id,
        responseId: resp.id,
        params: { marketplace: MARKETPLACE_SLUG },
      },
      {
        onSuccess: () => {
          setDeleteOpen(false);
          onRefetch();
        },
      },
    );
  }

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Stars value={review.rating} size="sm" />
            <span className="text-xs font-medium">{review.rating}/5</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {displayName} · {timeAgo(review.createdAt)}
          </p>
        </div>
        {!editing && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-xs"
            onClick={() => setEditing(true)}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            {resp ? 'Edit response' : 'Respond'}
          </Button>
        )}
      </div>
      {review.title && <p className="mt-2 text-sm font-medium">{review.title}</p>}
      {review.body && <p className="mt-1 text-sm text-muted-foreground">{review.body}</p>}

      {resp && !editing && (
        <div className="mt-3 rounded-lg border-l-2 border-primary/40 bg-muted/40 px-3 py-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-primary/70">
                Your response
              </p>
              <p className="text-sm text-foreground/80">{resp.response}</p>
            </div>
            <div className="flex shrink-0 gap-1">
              <button
                className="rounded p-0.5 text-muted-foreground/60 hover:text-foreground"
                onClick={() => setEditing(true)}
                title="Edit response"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                className="rounded p-0.5 text-muted-foreground/60 hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
                title="Delete response"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <ResponseEditor
          reviewId={review.id}
          existing={resp}
          onDone={() => { setEditing(false); onRefetch(); }}
        />
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your response?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove your response to this review.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteResponse}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const SORT_LABELS: Record<string, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  highest: 'Highest rated',
  lowest: 'Lowest rated',
};

export default function ReviewsPage() {
  const { businessId } = useDashboard();

  const [sort, setSortState] = useState<ListReviewsSort>(ListReviewsSort.newest);
  const [ratingFilter, setRatingFilterState] = useState<number | undefined>(undefined);

  const isFirstPageRef = useRef(true);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [allReviews, setAllReviews] = useState<ReviewWithResponse[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  function setSort(s: ListReviewsSort) {
    isFirstPageRef.current = true;
    setSortState(s);
    setCursor(undefined);
    setAllReviews([]);
    setHasMore(false);
    setNextCursor(null);
  }

  function setRatingFilter(r: number | undefined) {
    isFirstPageRef.current = true;
    setRatingFilterState(r);
    setCursor(undefined);
    setAllReviews([]);
    setHasMore(false);
    setNextCursor(null);
  }

  const listReviewsParams = {
    businessId: businessId ?? '',
    marketplace: MARKETPLACE_SLUG,
    limit: PAGE_LIMIT,
    sort,
    rating: ratingFilter,
    ...(cursor ? { cursor } : {}),
  };
  const summaryParams = { businessId: businessId ?? '', marketplace: MARKETPLACE_SLUG };

  const {
    data: reviewsData,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useListReviews(listReviewsParams, {
    query: { enabled: !!businessId, queryKey: getListReviewsQueryKey(listReviewsParams) },
  });

  const { data: summaryData } = useGetReviewSummary(summaryParams, {
    query: { enabled: !!businessId, queryKey: getGetReviewSummaryQueryKey(summaryParams) },
  });

  useEffect(() => {
    if (!reviewsData) return;
    const page = (reviewsData?.data ?? []) as ReviewWithResponse[];
    const pagination = (reviewsData as any)?.pagination as
      | { hasMore: boolean; nextCursor: string | null }
      | undefined;

    if (isFirstPageRef.current) {
      setAllReviews(page);
    } else {
      setAllReviews((prev) => {
        const existingIds = new Set(prev.map((r) => r.id));
        return [...prev, ...page.filter((r) => !existingIds.has(r.id))];
      });
    }
    setHasMore(pagination?.hasMore ?? false);
    setNextCursor(pagination?.nextCursor ?? null);
  }, [reviewsData]);

  function handleLoadMore() {
    if (nextCursor) {
      isFirstPageRef.current = false;
      setCursor(nextCursor);
    }
  }

  const summary = summaryData?.data;
  const showLoading = isLoading && allReviews.length === 0;

  if (!businessId) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center px-4">
        <MessageSquare className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No business found. Claim or register your business first.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-xl font-bold">Reviews</h1>
        <p className="text-sm text-muted-foreground">Manage and respond to customer reviews.</p>
      </div>

      <AnalyticsCard
        avg={summary?.avgRating ?? null}
        total={summary?.totalCount ?? 0}
        distribution={summary?.distribution as Record<string, number> | undefined}
      />

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                {SORT_LABELS[sort]}
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {Object.entries(SORT_LABELS).map(([val, label]) => (
                <DropdownMenuItem
                  key={val}
                  onClick={() => setSort(val as ListReviewsSort)}
                  className={sort === val ? 'font-medium text-primary' : ''}
                >
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex gap-1">
            {ratingFilter !== undefined ? (
              <button
                className="flex h-8 items-center gap-1 rounded-md border bg-amber-50 px-2 text-xs font-medium text-amber-700 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-300"
                onClick={() => setRatingFilter(undefined)}
              >
                ✕ {ratingFilter}★
              </button>
            ) : (
              [5, 4, 3, 2, 1].map((r) => (
                <button
                  key={r}
                  className="flex h-8 items-center gap-0.5 rounded-md border px-2 text-xs hover:bg-muted"
                  onClick={() => setRatingFilter(r)}
                >
                  {r}★
                </button>
              ))
            )}
          </div>
        </div>

        {isError && allReviews.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed py-10 text-center">
            <AlertCircle className="h-7 w-7 text-destructive/50" />
            <p className="text-sm text-muted-foreground">Failed to load reviews.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Try again
            </Button>
          </div>
        ) : showLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl border bg-muted" />
            ))}
          </div>
        ) : allReviews.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed py-12 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">No reviews yet.</p>
            <p className="text-xs text-muted-foreground/70">
              Reviews from customers will appear here.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {allReviews.map((r) => (
                <ReviewRow key={r.id} review={r} onRefetch={() => refetch()} />
              ))}
            </div>

            {hasMore && nextCursor && (
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
                    'Load more'
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
