import type { GetReviewSummary200 } from '@workspace/api-client-react';
import { Star } from 'lucide-react';

type ReviewSummaryData = NonNullable<GetReviewSummary200['data']>;

interface ReviewSummaryProps {
  summary: ReviewSummaryData | undefined;
}

function Stars({ value, size = 'md' }: { value: number; size?: 'sm' | 'md' | 'lg' }) {
  const cls =
    size === 'lg' ? 'h-6 w-6' : size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5';
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`${cls} ${
            i < Math.round(value)
              ? 'fill-amber-400 text-amber-400'
              : 'fill-muted text-muted-foreground/30'
          }`}
        />
      ))}
    </div>
  );
}

export { Stars };

export function ReviewSummary({ summary }: ReviewSummaryProps) {
  if (!summary || !summary.avgRating || !summary.totalCount) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Stars value={0} />
        <span>No reviews yet</span>
      </div>
    );
  }

  const avg = summary.avgRating;
  const count = summary.totalCount;

  return (
    <div className="flex flex-col items-start gap-4 rounded-xl border bg-card p-5 sm:flex-row sm:items-center">
      <div className="flex flex-col items-center gap-1">
        <span className="text-5xl font-bold leading-none tracking-tight">{avg.toFixed(1)}</span>
        <Stars value={avg} size="lg" />
        <span className="text-xs text-muted-foreground">
          {count} review{count !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="flex-1">
        <p className="text-sm text-muted-foreground">
          {avg >= 4.5
            ? 'Exceptional quality — highly rated by customers.'
            : avg >= 4.0
            ? 'Excellent service with very satisfied customers.'
            : avg >= 3.5
            ? 'Good service with mostly positive feedback.'
            : avg >= 3.0
            ? 'Average ratings — mixed customer experiences.'
            : 'Below average — customers have noted concerns.'}
        </p>
      </div>
    </div>
  );
}
