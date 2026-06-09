import type { ListReviews200 } from '@workspace/api-client-react';
import { Stars } from './ReviewSummary';
import { MessageSquare, UserCircle } from 'lucide-react';

type Review = NonNullable<ListReviews200['data']>[number];

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

function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="flex gap-3 rounded-xl border bg-card p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
        <UserCircle className="h-5 w-5 text-muted-foreground/60" />
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Stars value={review.rating} size="sm" />
            <span className="text-xs font-medium">{review.rating}/5</span>
          </div>
          <span className="text-xs text-muted-foreground">{timeAgo(review.createdAt)}</span>
        </div>
        {review.title && (
          <p className="text-sm font-medium leading-snug">{review.title}</p>
        )}
        {review.body && (
          <p className="text-sm text-muted-foreground">{review.body}</p>
        )}
        {review.isAnonymous && (
          <p className="text-[11px] italic text-muted-foreground/60">Anonymous reviewer</p>
        )}
      </div>
    </div>
  );
}

interface ReviewListProps {
  reviews: Review[];
  isLoading: boolean;
}

export function ReviewList({ reviews, isLoading }: ReviewListProps) {
  if (isLoading) {
    return (
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
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed bg-muted/20 py-12 text-center">
        <MessageSquare className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm font-medium text-muted-foreground">No reviews yet.</p>
        <p className="text-xs text-muted-foreground/70">
          Be the first to leave a review for this business.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reviews.map((r) => (
        <ReviewCard key={r.id} review={r} />
      ))}
    </div>
  );
}
