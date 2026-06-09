import type { GetBusiness200 } from '@workspace/api-client-react';
import { Badge } from '@/components/ui/badge';
import { MapPin, ShieldCheck, Star } from 'lucide-react';

type BusinessDetail = NonNullable<GetBusiness200['data']>;
type ReviewSummaryData = { avgRating?: number | null; totalCount?: number };

interface BusinessHeroProps {
  business: BusinessDetail;
  reviewSummary?: ReviewSummaryData;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
    active: { label: 'Active', variant: 'default' },
    pending: { label: 'Pending Review', variant: 'secondary' },
    inactive: { label: 'Inactive', variant: 'outline' },
    archived: { label: 'Archived', variant: 'destructive' },
  };
  const cfg = map[status] ?? { label: status, variant: 'outline' as const };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

function StarRating({ value, count }: { value: number; count: number }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < full
                ? 'fill-amber-400 text-amber-400'
                : i === full && half
                ? 'fill-amber-200 text-amber-400'
                : 'fill-muted text-muted-foreground/30'
            }`}
          />
        ))}
      </div>
      <span className="text-sm font-medium">{value.toFixed(1)}</span>
      <span className="text-sm text-muted-foreground">({count} review{count !== 1 ? 's' : ''})</span>
    </div>
  );
}

export function BusinessHero({ business, reviewSummary }: BusinessHeroProps) {
  const initials = business.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  const primaryCategory = business.categories?.find((c) => c.isPrimary) ?? business.categories?.[0];
  const avgRating = reviewSummary?.avgRating ?? null;
  const totalCount = reviewSummary?.totalCount ?? 0;

  return (
    <div className="relative">
      <div className="h-36 w-full bg-gradient-to-br from-primary/20 via-primary/10 to-muted sm:h-48" />
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="-mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border-4 border-background bg-primary/10 text-2xl font-bold text-primary shadow-sm sm:h-28 sm:w-28">
            {initials}
          </div>
          <div className="flex flex-1 flex-col gap-1 pb-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{business.name}</h1>
              <StatusBadge status={business.status} />
              {business.claimStatus === 'verified' && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <ShieldCheck className="h-3 w-3" />
                  Verified
                </Badge>
              )}
            </div>
            {business.tagline && (
              <p className="text-sm text-muted-foreground">{business.tagline}</p>
            )}
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {primaryCategory && (
                <span className="font-medium text-foreground">{primaryCategory.name}</span>
              )}
              {business.addressLine1 && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {business.addressLine1}
                </span>
              )}
              {avgRating !== null && totalCount > 0 && (
                <StarRating value={avgRating} count={totalCount} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function BusinessHeroSkeleton() {
  return (
    <div>
      <div className="h-36 w-full animate-pulse bg-muted sm:h-48" />
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="-mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end">
          <div className="h-24 w-24 animate-pulse rounded-2xl border-4 border-background bg-muted sm:h-28 sm:w-28" />
          <div className="flex flex-1 flex-col gap-2 pb-2">
            <div className="h-7 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-64 animate-pulse rounded bg-muted" />
            <div className="h-4 w-36 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}
