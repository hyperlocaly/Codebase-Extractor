import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface LoadMoreProps {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  count: number;
}

export function LoadMore({ hasMore, isLoading, onLoadMore, count }: LoadMoreProps) {
  if (!hasMore && !isLoading) return null;

  return (
    <div className="flex flex-col items-center gap-2 pt-4">
      {count > 0 && (
        <p className="text-xs text-muted-foreground">
          Showing {count} business{count !== 1 ? 'es' : ''}
        </p>
      )}
      <Button
        variant="outline"
        onClick={onLoadMore}
        disabled={isLoading || !hasMore}
        className="gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading more…
          </>
        ) : (
          'Load More'
        )}
      </Button>
    </div>
  );
}
