import type { BusinessSummary } from '@workspace/api-client-react';
import { BusinessCard, BusinessCardSkeleton, BusinessCardEmpty } from './BusinessCard';

interface BusinessGridProps {
  businesses: BusinessSummary[];
  isLoading?: boolean;
  skeletonCount?: number;
}

export function BusinessGrid({
  businesses,
  isLoading = false,
  skeletonCount = 6,
}: BusinessGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {isLoading ? (
        Array.from({ length: skeletonCount }).map((_, i) => (
          <BusinessCardSkeleton key={i} />
        ))
      ) : businesses.length === 0 ? (
        <BusinessCardEmpty />
      ) : (
        businesses.map((business) => (
          <BusinessCard key={business.id} business={business} />
        ))
      )}
    </div>
  );
}
