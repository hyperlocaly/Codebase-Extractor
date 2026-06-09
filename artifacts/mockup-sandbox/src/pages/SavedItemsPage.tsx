import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListSavedItems,
  useRemoveSavedItem,
  getListSavedItemsQueryKey,
} from '@workspace/api-client-react';
import { MARKETPLACE_SLUG } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import {
  Bookmark,
  BookmarkX,
  Store,
  Package,
  Wrench,
  AlertCircle,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface SavedItem {
  id: string;
  entityType: 'business' | 'product' | 'service';
  entityId: string;
  createdAt: string;
}

const ENTITY_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  business: { label: 'Business', icon: Store, color: 'text-blue-600' },
  product: { label: 'Product', icon: Package, color: 'text-emerald-600' },
  service: { label: 'Service', icon: Wrench, color: 'text-purple-600' },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function SavedItemCard({
  item,
  onRemove,
  isRemoving,
}: {
  item: SavedItem;
  onRemove: () => void;
  isRemoving: boolean;
}) {
  const cfg = ENTITY_CONFIG[item.entityType] ?? ENTITY_CONFIG.business;
  const Icon = cfg.icon;

  return (
    <div className="flex items-center gap-4 rounded-xl border bg-card p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
        <Icon className={`h-5 w-5 ${cfg.color}`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {cfg.label}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Saved {formatDate(item.createdAt)}
          </span>
        </div>
        <p className="mt-0.5 truncate text-sm text-muted-foreground font-mono">
          {item.entityId}
        </p>
        {item.entityType === 'business' && (
          <Link
            to="/directory"
            className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Browse directory →
          </Link>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={onRemove}
        disabled={isRemoving}
        title="Remove from saved"
      >
        {isRemoving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <BookmarkX className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-4 rounded-xl border bg-card p-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      ))}
    </div>
  );
}

export default function SavedItemsPage() {
  const queryClient = useQueryClient();
  const [pendingRemove, setPendingRemove] = useState<SavedItem | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | undefined>();

  const listParams = { marketplace: MARKETPLACE_SLUG, limit: 20, ...(cursor ? { cursor } : {}) };
  const savedQK = getListSavedItemsQueryKey(listParams);

  const { data, isLoading, isError, refetch } = useListSavedItems(listParams, {
    query: { queryKey: savedQK },
  });

  const removeMutation = useRemoveSavedItem();

  const items = ((data as any)?.data ?? []) as SavedItem[];
  const pagination = (data as any)?.pagination as
    | { hasMore: boolean; nextCursor: string | null }
    | undefined;

  async function handleConfirmRemove() {
    if (!pendingRemove) return;
    const item = pendingRemove;
    setPendingRemove(null);
    setRemovingId(item.id);
    try {
      await removeMutation.mutateAsync({
        id: item.id,
        params: { marketplace: MARKETPLACE_SLUG },
      });
      toast.success('Removed from saved items.');
      queryClient.invalidateQueries({ queryKey: getListSavedItemsQueryKey({ marketplace: MARKETPLACE_SLUG }) });
    } catch {
      toast.error('Failed to remove. Please try again.');
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex items-center gap-3">
        <Bookmark className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold">Saved Items</h1>
          <p className="text-sm text-muted-foreground">
            Businesses, products and services you've bookmarked.
          </p>
        </div>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed py-14 text-center">
          <AlertCircle className="h-8 w-8 text-destructive/50" />
          <p className="text-sm text-muted-foreground">Failed to load saved items.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Try again
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed bg-muted/10 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Bookmark className="h-7 w-7 text-muted-foreground/30" />
          </div>
          <div className="space-y-1">
            <p className="font-medium">Nothing saved yet</p>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Browse the directory and tap the bookmark icon on any business to save it here.
            </p>
          </div>
          <Button asChild>
            <Link to="/directory">Browse Directory</Link>
          </Button>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {items.length} saved item{items.length !== 1 ? 's' : ''}
            {pagination?.hasMore ? '+' : ''}
          </p>
          <div className="space-y-3">
            {items.map((item) => (
              <SavedItemCard
                key={item.id}
                item={item}
                onRemove={() => setPendingRemove(item)}
                isRemoving={removingId === item.id}
              />
            ))}
          </div>
          {pagination?.hasMore && pagination.nextCursor && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={() => setCursor(pagination.nextCursor!)}
              >
                Load More
              </Button>
            </div>
          )}
        </>
      )}

      <AlertDialog open={!!pendingRemove} onOpenChange={(o) => !o && setPendingRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove saved item?</AlertDialogTitle>
            <AlertDialogDescription>
              This {pendingRemove?.entityType ?? 'item'} will be removed from your saved list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmRemove}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
