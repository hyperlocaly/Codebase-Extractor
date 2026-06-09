import { useListBusinesses } from '@workspace/api-client-react';
import { MARKETPLACE_SLUG } from '@/lib/constants';
import { HeroBanner } from '@/components/home/HeroBanner';
import { CategoryChips } from '@/components/home/CategoryChips';
import { BusinessGrid } from '@/components/business/BusinessGrid';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

function SectionHeading({
  title,
  subtitle,
  id,
}: {
  title: string;
  subtitle?: string;
  id?: string;
}) {
  return (
    <div className="mb-5">
      <h2 id={id} className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
      {subtitle && (
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}

export default function HomePage() {
  const {
    data,
    isLoading: businessesLoading,
    isError: businessesError,
    refetch,
  } = useListBusinesses({ marketplace: MARKETPLACE_SLUG, limit: 6 });

  const businesses = data?.data ?? [];

  return (
    <div className="min-h-screen">
      <HeroBanner />

      <div className="mx-auto max-w-5xl space-y-12 px-4 py-10 sm:px-6 sm:py-14">
        <section aria-labelledby="categories-heading">
          <SectionHeading
            id="categories-heading"
            title="Browse by Category"
            subtitle="Find the right fashion professional for your needs."
          />
          <CategoryChips parentSlug="fashion-tailoring" />
        </section>

        <section aria-labelledby="featured-heading">
          <SectionHeading
            id="featured-heading"
            title="Featured Businesses"
            subtitle="Discover top-rated tailors and designers on Fashion Nigeria."
          />

          {businessesError ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed bg-muted/20 px-6 py-14 text-center">
              <AlertCircle className="h-8 w-8 text-destructive/60" />
              <p className="text-sm font-medium text-destructive">
                Failed to load businesses.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
              >
                Try Again
              </Button>
            </div>
          ) : (
            <BusinessGrid
              businesses={businesses}
              isLoading={businessesLoading}
              skeletonCount={6}
            />
          )}
        </section>
      </div>
    </div>
  );
}
