import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  useAdminListBusinesses,
  useAdminUpdateBusinessStatus,
  getAdminListBusinessesQueryKey,
} from '@workspace/api-client-react';
import { MARKETPLACE_SLUG } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import {
  Store,
  Search,
  ChevronDown,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

type AdminBusiness = {
  id: string;
  name: string;
  slug: string;
  status: string;
  claimStatus: string | null;
  verificationScore: number | null;
  publishedAt: string | null;
  createdAt: string;
};

const STATUS_LABELS: Record<string, string> = {
  all: 'All statuses',
  draft: 'Draft',
  active: 'Active',
  suspended: 'Suspended',
  archived: 'Archived',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  draft: 'secondary',
  suspended: 'destructive',
  archived: 'outline',
};

const NEXT_STATUS_OPTIONS: Record<string, string[]> = {
  draft: ['active', 'archived'],
  active: ['suspended', 'archived'],
  suspended: ['active', 'archived'],
  archived: ['draft'],
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface StatusChangeTarget {
  business: AdminBusiness;
  newStatus: string;
}

export default function AdminBusinessesPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQ, setSearchQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [confirmTarget, setConfirmTarget] = useState<StatusChangeTarget | null>(null);

  const listParams = {
    marketplace: MARKETPLACE_SLUG,
    limit: 20,
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
    ...(debouncedQ ? { q: debouncedQ } : {}),
  };

  const { data, isLoading, isError, refetch } = useAdminListBusinesses(listParams, {
    query: { queryKey: getAdminListBusinessesQueryKey(listParams) },
  });

  const { mutate: updateStatus, isPending: isUpdating } = useAdminUpdateBusinessStatus();

  const businesses = ((data as any)?.data ?? []) as AdminBusiness[];
  const pagination = (data as any)?.pagination as { hasMore: boolean; nextCursor: string | null } | undefined;

  function handleSearchChange(value: string) {
    setSearchQ(value);
    const timer = setTimeout(() => setDebouncedQ(value), 400);
    return () => clearTimeout(timer);
  }

  function confirmStatusChange(business: AdminBusiness, newStatus: string) {
    setConfirmTarget({ business, newStatus });
  }

  function executeStatusChange() {
    if (!confirmTarget) return;
    const { business, newStatus } = confirmTarget;
    setConfirmTarget(null);

    updateStatus(
      {
        id: business.id,
        params: { marketplace: MARKETPLACE_SLUG },
        data: { status: newStatus as any },
      },
      {
        onSuccess: () => {
          toast.success(`${business.name} set to ${newStatus}`);
          queryClient.invalidateQueries({ queryKey: getAdminListBusinessesQueryKey(listParams) });
        },
        onError: () => {
          toast.error('Failed to update status. Please try again.');
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Businesses</h1>
        <p className="text-sm text-muted-foreground">
          All businesses in this marketplace. Filter, search, and moderate.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQ}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by business name…"
            className="pl-9"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              {STATUS_LABELS[statusFilter]}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {Object.entries(STATUS_LABELS).map(([val, label]) => (
              <DropdownMenuItem
                key={val}
                onClick={() => setStatusFilter(val)}
                className={statusFilter === val ? 'font-medium text-primary' : ''}
              >
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isError ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed bg-muted/20 px-6 py-14 text-center">
          <AlertCircle className="h-8 w-8 text-destructive/60" />
          <p className="text-sm text-muted-foreground">Failed to load businesses.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Try again
          </Button>
        </div>
      ) : isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : businesses.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed py-14 text-center">
          <Store className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No businesses found.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Business</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell">Status</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">Claimed</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell">Created</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {businesses.map((biz) => (
                <tr key={biz.id} className="bg-card hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Store className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{biz.name}</p>
                        <p className="truncate text-xs text-muted-foreground/60">{biz.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <Badge variant={STATUS_VARIANT[biz.status] ?? 'outline'} className="capitalize">
                      {biz.status}
                    </Badge>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <span className="text-xs capitalize text-muted-foreground">
                      {biz.claimStatus ?? 'unclaimed'}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-muted-foreground lg:table-cell">
                    {formatDate(biz.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="View public listing">
                        <a href={`/business/${biz.slug}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                      {(NEXT_STATUS_OPTIONS[biz.status] ?? []).length > 0 && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" disabled={isUpdating}>
                              {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Change status'}
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {(NEXT_STATUS_OPTIONS[biz.status] ?? []).map((s) => (
                              <DropdownMenuItem key={s} onClick={() => confirmStatusChange(biz, s)}>
                                Set to <span className="ml-1 font-medium capitalize">{s}</span>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pagination?.hasMore && (
            <div className="border-t p-3 text-center">
              <p className="text-xs text-muted-foreground">More results available — use search or filters to narrow down.</p>
            </div>
          )}
        </div>
      )}

      <AlertDialog open={!!confirmTarget} onOpenChange={(o) => !o && setConfirmTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change business status?</AlertDialogTitle>
            <AlertDialogDescription>
              Set <strong>{confirmTarget?.business.name}</strong> to{' '}
              <strong className="capitalize">{confirmTarget?.newStatus}</strong>?
              {confirmTarget?.newStatus === 'suspended' && ' This will hide the business from the directory.'}
              {confirmTarget?.newStatus === 'active' && ' This will publish the business to the directory.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeStatusChange}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
