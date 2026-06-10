import { useState } from 'react';
import type { ReviewSummary, ReviewResponse } from '@workspace/api-client-react';
import { useReportReview } from '@workspace/api-client-react';
import { Stars } from './ReviewSummary';
import { MessageSquare, UserCircle, Flag, AlertCircle, RefreshCw, ChevronDown, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MARKETPLACE_SLUG } from '@/lib/constants';

type ReviewWithResponse = ReviewSummary & { ownerResponse?: ReviewResponse | null };

export type SortOption = 'newest' | 'oldest' | 'highest' | 'lowest';

function timeAgo(date: Date | string | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = Date.now();
  const diff = now - d.getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) !== 1 ? 's' : ''} ago`;
  if (days < 365) return `${Math.floor(days / 30)} month${Math.floor(days / 30) !== 1 ? 's' : ''} ago`;
  return `${Math.floor(days / 365)} year${Math.floor(days / 365) !== 1 ? 's' : ''} ago`;
}

function initials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function OwnerResponseBlock({ response }: { response: ReviewResponse }) {
  return (
    <div className="mt-3 rounded-lg border-l-2 border-primary/40 bg-muted/40 px-3 py-2.5">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-primary/70">
        Owner response
      </p>
      <p className="text-sm text-foreground/80">{response.response}</p>
      <p className="mt-1 text-[11px] text-muted-foreground/60">{timeAgo(response.createdAt)}</p>
    </div>
  );
}

function ReportDialog({
  reviewId,
  open,
  onClose,
}: {
  reviewId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const { mutate: report, isPending } = useReportReview();

  function submit() {
    if (reason.trim().length < 5) return;
    report(
      { id: reviewId, params: { marketplace: MARKETPLACE_SLUG }, data: { reason: reason.trim() } },
      {
        onSuccess: () => {
          setReason('');
          onClose();
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Report review</DialogTitle>
          <DialogDescription>
            Tell us why this review violates community guidelines.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="reason">Reason</Label>
          <Textarea
            id="reason"
            placeholder="Describe why this review is abusive or misleading…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={submit}
            disabled={isPending || reason.trim().length < 5}
          >
            {isPending ? 'Submitting…' : 'Submit report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReviewCard({
  review,
  isAuthenticated,
  currentUserId,
  onEditRequest,
  onDeleteRequest,
}: {
  review: ReviewWithResponse;
  isAuthenticated: boolean;
  currentUserId?: string | null;
  onEditRequest?: (review: ReviewWithResponse) => void;
  onDeleteRequest?: (reviewId: string) => void;
}) {
  const [reportOpen, setReportOpen] = useState(false);

  const isOwnReview =
    !!currentUserId &&
    !review.isAnonymous &&
    (review as any).reviewerId === currentUserId;

  const displayName = review.isAnonymous ? 'Anonymous' : (review.reviewerName ?? 'Customer');
  const avatar = review.isAnonymous ? null : initials(review.reviewerName);

  return (
    <div className="flex gap-3 rounded-xl border bg-card p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
        {avatar ? avatar : <UserCircle className="h-5 w-5 text-muted-foreground/60" />}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Stars value={review.rating} size="sm" />
              <span className="text-xs font-medium">{review.rating}/5</span>
            </div>
            <p className="text-xs font-medium text-foreground/80">{displayName}</p>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">{timeAgo(review.createdAt)}</span>
            {isOwnReview && onEditRequest && (
              <button
                className="ml-1 rounded p-0.5 text-muted-foreground/50 transition-colors hover:text-primary"
                title="Edit your review"
                onClick={() => onEditRequest(review)}
              >
                <Pencil className="h-3 w-3" />
              </button>
            )}
            {isOwnReview && onDeleteRequest && (
              <button
                className="rounded p-0.5 text-muted-foreground/50 transition-colors hover:text-destructive"
                title="Delete your review"
                onClick={() => onDeleteRequest(review.id)}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
            {isAuthenticated && !isOwnReview && (
              <button
                className="ml-1 rounded p-0.5 text-muted-foreground/40 transition-colors hover:text-destructive/70"
                title="Report review"
                onClick={() => setReportOpen(true)}
              >
                <Flag className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
        {review.title && (
          <p className="text-sm font-medium leading-snug">{review.title}</p>
        )}
        {review.body && (
          <p className="text-sm text-muted-foreground">{review.body}</p>
        )}
        {review.ownerResponse && (
          <OwnerResponseBlock response={review.ownerResponse} />
        )}
      </div>
      {isAuthenticated && !isOwnReview && (
        <ReportDialog
          reviewId={review.id}
          open={reportOpen}
          onClose={() => setReportOpen(false)}
        />
      )}
    </div>
  );
}

const SORT_LABELS: Record<SortOption, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  highest: 'Highest rated',
  lowest: 'Lowest rated',
};

interface ReviewListProps {
  reviews: ReviewWithResponse[];
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  sort: SortOption;
  onSortChange: (s: SortOption) => void;
  ratingFilter: number | undefined;
  onRatingFilterChange: (r: number | undefined) => void;
  isAuthenticated: boolean;
  currentUserId?: string | null;
  onEditRequest?: (review: ReviewWithResponse) => void;
  onDeleteRequest?: (reviewId: string) => void;
}

export function ReviewList({
  reviews,
  isLoading,
  isError,
  onRetry,
  sort,
  onSortChange,
  ratingFilter,
  onRatingFilterChange,
  isAuthenticated,
  currentUserId,
  onEditRequest,
  onDeleteRequest,
}: ReviewListProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
              {SORT_LABELS[sort]}
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([val, label]) => (
              <DropdownMenuItem
                key={val}
                onClick={() => onSortChange(val)}
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
              onClick={() => onRatingFilterChange(undefined)}
            >
              ✕ {ratingFilter}★
            </button>
          ) : (
            [5, 4, 3, 2, 1].map((r) => (
              <button
                key={r}
                className="flex h-8 items-center gap-0.5 rounded-md border px-2 text-xs hover:bg-muted"
                onClick={() => onRatingFilterChange(r)}
              >
                {r}★
              </button>
            ))
          )}
        </div>
      </div>

      {isError ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed bg-muted/20 py-10 text-center">
          <AlertCircle className="h-7 w-7 text-destructive/50" />
          <p className="text-sm text-muted-foreground">Failed to load reviews.</p>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Try again
            </Button>
          )}
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3 rounded-xl border bg-card p-4">
              <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="h-3 w-full animate-pulse rounded bg-muted" />
                <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed bg-muted/20 py-12 text-center">
          <MessageSquare className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">No reviews yet.</p>
          <p className="text-xs text-muted-foreground/70">
            {ratingFilter !== undefined
              ? `No ${ratingFilter}-star reviews found. Try a different filter.`
              : 'Be the first to leave a review for this business.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <ReviewCard
              key={r.id}
              review={r}
              isAuthenticated={isAuthenticated}
              currentUserId={currentUserId}
              onEditRequest={onEditRequest}
              onDeleteRequest={onDeleteRequest}
            />
          ))}
        </div>
      )}
    </div>
  );
}
