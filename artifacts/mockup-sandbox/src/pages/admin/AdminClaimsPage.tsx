import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useAdminListClaimRequests,
  useAdminResolveClaim,
  getAdminListClaimRequestsQueryKey,
} from '@workspace/api-client-react';
import { MARKETPLACE_SLUG } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  ChevronDown,
  AlertCircle,
  RefreshCw,
  Loader2,
  Store,
  User,
} from 'lucide-react';
import { toast } from 'sonner';

type ClaimRequest = {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  evidenceUrl: string | null;
  adminNote: string | null;
  createdAt: string;
  business: { id: string; name: string; slug: string };
  user: { id: string; email: string; displayName: string | null };
};

const STATUS_FILTER_LABELS: Record<string, string> = {
  all: 'All statuses',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

const STATUS_BADGE: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  pending: { variant: 'secondary', label: 'Pending' },
  approved: { variant: 'default', label: 'Approved' },
  rejected: { variant: 'destructive', label: 'Rejected' },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface ResolveTarget {
  claim: ClaimRequest;
  action: 'approved' | 'rejected';
}

export default function AdminClaimsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [resolveTarget, setResolveTarget] = useState<ResolveTarget | null>(null);
  const [adminNote, setAdminNote] = useState('');

  const listParams = {
    marketplace: MARKETPLACE_SLUG,
    limit: 20,
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
  };

  const { data, isLoading, isError, refetch } = useAdminListClaimRequests(listParams, {
    query: { queryKey: getAdminListClaimRequestsQueryKey(listParams) },
  });

  const { mutate: resolveClaim, isPending: isResolving } = useAdminResolveClaim();

  const claims = ((data as any)?.data ?? []) as ClaimRequest[];
  const pagination = (data as any)?.pagination as { hasMore: boolean; nextCursor: string | null } | undefined;

  function openResolve(claim: ClaimRequest, action: 'approved' | 'rejected') {
    setResolveTarget({ claim, action });
    setAdminNote('');
  }

  function executeResolve() {
    if (!resolveTarget) return;
    const { claim, action } = resolveTarget;

    resolveClaim(
      {
        id: claim.id,
        params: { marketplace: MARKETPLACE_SLUG },
        data: { status: action, ...(adminNote.trim() ? { adminNote: adminNote.trim() } : {}) },
      },
      {
        onSuccess: () => {
          toast.success(`Claim ${action === 'approved' ? 'approved' : 'rejected'}`);
          setResolveTarget(null);
          queryClient.invalidateQueries({ queryKey: getAdminListClaimRequestsQueryKey(listParams) });
        },
        onError: () => {
          toast.error('Failed to resolve claim. Please try again.');
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Claim Requests</h1>
        <p className="text-sm text-muted-foreground">
          Review and resolve business ownership claims.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              {STATUS_FILTER_LABELS[statusFilter]}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {Object.entries(STATUS_FILTER_LABELS).map(([val, label]) => (
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
          <p className="text-sm text-muted-foreground">Failed to load claim requests.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Try again
          </Button>
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : claims.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed py-14 text-center">
          <ClipboardList className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No claim requests found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {claims.map((claim) => {
            const badgeCfg = STATUS_BADGE[claim.status] ?? { variant: 'outline' as const, label: claim.status };
            const isPending = claim.status === 'pending';
            return (
              <div key={claim.id} className="rounded-xl border bg-card p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={badgeCfg.variant}>{badgeCfg.label}</Badge>
                      <span className="text-xs text-muted-foreground">
                        Submitted {formatDate(claim.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Store className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium">{claim.business.name}</span>
                      <a
                        href={`/business/${claim.business.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        View →
                      </a>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>{claim.user.displayName ?? claim.user.email}</span>
                      <span className="text-muted-foreground/60">·</span>
                      <span>{claim.user.email}</span>
                    </div>
                  </div>

                  {isPending && (
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 border-emerald-400 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950"
                        onClick={() => openResolve(claim, 'approved')}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
                        onClick={() => openResolve(claim, 'rejected')}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>

                {claim.evidenceUrl && (
                  <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs">
                    <span className="text-muted-foreground">Evidence: </span>
                    <a
                      href={claim.evidenceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-primary hover:underline"
                    >
                      {claim.evidenceUrl}
                    </a>
                  </div>
                )}

                {claim.adminNote && (
                  <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs">
                    <span className="text-muted-foreground">Admin note: </span>
                    {claim.adminNote}
                  </div>
                )}
              </div>
            );
          })}

          {pagination?.hasMore && (
            <p className="pt-2 text-center text-xs text-muted-foreground">
              More results available — adjust filter to narrow down.
            </p>
          )}
        </div>
      )}

      <Sheet open={!!resolveTarget} onOpenChange={(o) => !o && setResolveTarget(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <SheetTitle>
              {resolveTarget?.action === 'approved' ? 'Approve' : 'Reject'} claim request?
            </SheetTitle>
            <SheetDescription>
              {resolveTarget?.action === 'approved'
                ? `Approving this claim will grant ${resolveTarget.claim.user.displayName ?? resolveTarget.claim.user.email} ownership of ${resolveTarget.claim.business.name} and set it to active.`
                : `Rejecting this claim will notify ${resolveTarget?.claim.user.displayName ?? resolveTarget?.claim.user.email} that their request was denied.`}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="rounded-lg border bg-muted/30 p-3 space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <Store className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">{resolveTarget?.claim.business.name}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                <span>{resolveTarget?.claim.user.displayName ?? resolveTarget?.claim.user.email}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Admin note{resolveTarget?.action === 'rejected' ? ' (optional — shown to claimant)' : ' (optional)'}
              </label>
              <Textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Add a note for your records or the claimant…"
                rows={4}
                maxLength={1000}
              />
            </div>
          </div>

          <SheetFooter className="px-6 py-4 border-t flex-row gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setResolveTarget(null)}
              disabled={isResolving}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              onClick={executeResolve}
              disabled={isResolving}
              className={[
                'flex-1 sm:flex-none',
                resolveTarget?.action === 'approved'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-destructive hover:bg-destructive/90 text-destructive-foreground',
              ].join(' ')}
            >
              {isResolving ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  {resolveTarget?.action === 'approved' ? 'Approving…' : 'Rejecting…'}
                </>
              ) : resolveTarget?.action === 'approved' ? (
                'Approve claim'
              ) : (
                'Reject claim'
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
