import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchBusinesses } from '@workspace/api-client-react';
import type { BusinessSummary } from '@workspace/api-client-react';
import { MARKETPLACE_SLUG } from '@/lib/constants';

interface UseBusinessListParams {
  categorySlug?: string;
  locationSlug?: string;
  limit?: number;
}

export function useBusinessList({
  categorySlug,
  locationSlug,
  limit = 12,
}: UseBusinessListParams) {
  const [accBusinesses, setAccBusinesses] = useState<BusinessSummary[]>([]);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const filterKey = `${categorySlug ?? ''}|${locationSlug ?? ''}`;
  const filterKeyRef = useRef<string | null>(null);
  const isAppendRef = useRef(false);

  const { data, isFetching, isError, refetch } = useSearchBusinesses({
    marketplace: MARKETPLACE_SLUG,
    ...(categorySlug ? { categorySlug } : {}),
    ...(locationSlug ? { locationSlug } : {}),
    ...(cursor !== undefined ? { cursor } : {}),
    limit,
  });

  useEffect(() => {
    if (filterKeyRef.current !== filterKey) {
      filterKeyRef.current = filterKey;
      isAppendRef.current = false;
      setCursor(undefined);
      setAccBusinesses([]);
      setHasMore(false);
      setNextCursor(null);
    }
  }, [filterKey]);

  useEffect(() => {
    if (!data?.data) return;
    const items: BusinessSummary[] = data.data;
    if (isAppendRef.current) {
      setAccBusinesses((prev) => [...prev, ...items]);
      isAppendRef.current = false;
    } else {
      setAccBusinesses(items);
    }
    setHasMore(data.pagination?.hasMore ?? false);
    setNextCursor(data.pagination?.nextCursor ?? null);
  }, [data]);

  const loadMore = useCallback(() => {
    if (!hasMore || !nextCursor || isFetching) return;
    isAppendRef.current = true;
    setCursor(nextCursor);
  }, [hasMore, nextCursor, isFetching]);

  const isFirstLoad = isFetching && accBusinesses.length === 0;
  const isLoadingMore = isFetching && accBusinesses.length > 0;

  return {
    businesses: accBusinesses,
    isLoading: isFirstLoad,
    isLoadingMore,
    isError,
    hasMore,
    loadMore,
    refetch,
    count: accBusinesses.length,
  };
}
