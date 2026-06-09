import {
  useListBusinessVerifications,
  getListBusinessVerificationsQueryKey,
} from '@workspace/api-client-react';
import { useDashboard } from '@/providers/DashboardProvider';
import { MARKETPLACE_SLUG } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Info,
} from 'lucide-react';

interface VerificationType {
  id: string;
  code?: string;
  name?: string;
  description?: string;
  weight?: number;
}

interface VerificationRecord {
  id: string;
  status: string;
  verifiedAt?: string | null;
  expiresAt?: string | null;
  evidenceUrl?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  verificationType: VerificationType;
}

const STATUS_CONFIG: Record<string, {
  label: string;
  color: string;
  bg: string;
  icon: React.ReactNode;
}> = {
  pending: {
    label: 'Pending review',
    color: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    icon: <Clock className="h-4 w-4 text-amber-500" />,
  },
  in_progress: {
    label: 'In progress',
    color: 'text-blue-700 dark:text-blue-300',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    icon: <AlertCircle className="h-4 w-4 text-blue-500" />,
  },
  verified: {
    label: 'Verified',
    color: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  },
  rejected: {
    label: 'Rejected',
    color: 'text-red-700 dark:text-red-300',
    bg: 'bg-red-50 dark:bg-red-900/20',
    icon: <XCircle className="h-4 w-4 text-red-500" />,
  },
  expired: {
    label: 'Expired',
    color: 'text-slate-600 dark:text-slate-400',
    bg: 'bg-slate-100 dark:bg-slate-800',
    icon: <ShieldOff className="h-4 w-4 text-slate-400" />,
  },
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] ?? {
    label: status,
    color: 'text-muted-foreground',
    bg: 'bg-muted',
    icon: <AlertCircle className="h-4 w-4 text-muted-foreground" />,
  };
}

function formatDate(d: string | null | undefined): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function VerificationCard({ record }: { record: VerificationRecord }) {
  const cfg = getStatusConfig(record.status);
  const isExpired = record.expiresAt && new Date(record.expiresAt) < new Date();
  const effectiveStatus = isExpired && record.status === 'verified' ? 'expired' : record.status;
  const effectiveCfg = getStatusConfig(effectiveStatus);

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${effectiveCfg.bg}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {effectiveCfg.icon}
          <span className="text-sm font-semibold">
            {record.verificationType.name ?? record.verificationType.code ?? 'Verification'}
          </span>
        </div>
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${effectiveCfg.color} ${effectiveCfg.bg} border`}>
          {effectiveCfg.label}
        </span>
      </div>

      {record.verificationType.description && (
        <p className="text-xs text-muted-foreground">{record.verificationType.description}</p>
      )}

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>Submitted</span>
        <span className="font-medium text-foreground">{formatDate(record.createdAt)}</span>

        {record.verifiedAt && (
          <>
            <span>Verified</span>
            <span className="font-medium text-foreground">{formatDate(record.verifiedAt)}</span>
          </>
        )}

        {record.expiresAt && (
          <>
            <span>Expires</span>
            <span className={`font-medium ${isExpired ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
              {formatDate(record.expiresAt)}
              {isExpired ? ' (expired)' : ''}
            </span>
          </>
        )}

        {record.verificationType.weight !== undefined && (
          <>
            <span>Score weight</span>
            <span className="font-medium text-foreground">{record.verificationType.weight}%</span>
          </>
        )}
      </div>

      {record.evidenceUrl && (
        <a
          href={record.evidenceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline"
        >
          View submitted evidence ↗
        </a>
      )}
    </div>
  );
}

function ScoreSummary({ records }: { records: VerificationRecord[] }) {
  const verified = records.filter((r) => {
    const isExpired = r.expiresAt && new Date(r.expiresAt) < new Date();
    return r.status === 'verified' && !isExpired;
  });

  const totalWeight = records.reduce((sum, r) => sum + (r.verificationType.weight ?? 0), 0);
  const earnedWeight = verified.reduce((sum, r) => sum + (r.verificationType.weight ?? 0), 0);
  const score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          Verification score
        </p>
        <span className="text-2xl font-bold">{score}%</span>
      </div>
      <Progress value={score} className="h-2" />
      <p className="text-xs text-muted-foreground">
        {verified.length} of {records.length} verification{records.length !== 1 ? 's' : ''} active ·{' '}
        {earnedWeight} of {totalWeight} weight points earned
      </p>
    </div>
  );
}

export default function VerificationPage() {
  const { businessId } = useDashboard();

  const listParams = { marketplace: MARKETPLACE_SLUG };

  const { data, isLoading, isError, refetch } = useListBusinessVerifications(
    businessId ?? '',
    listParams,
    {
      query: {
        enabled: !!businessId,
        queryKey: getListBusinessVerificationsQueryKey(businessId ?? '', listParams),
      },
    },
  );

  const records = ((data as any)?.data ?? []) as VerificationRecord[];

  const verified = records.filter((r) => {
    const isExpired = r.expiresAt && new Date(r.expiresAt) < new Date();
    return r.status === 'verified' && !isExpired;
  });
  const pending = records.filter((r) => r.status === 'pending' || r.status === 'in_progress');
  const rejected = records.filter((r) => r.status === 'rejected');

  if (!businessId) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center px-4">
        <ShieldCheck className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No business found. Create your business first.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-xl font-bold">Verification</h1>
        <p className="text-sm text-muted-foreground">
          Track your business verification status and credibility score.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-900/20">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
        <p className="text-xs text-blue-700 dark:text-blue-300">
          Verifications are initiated by the Fashion Nigeria team. Contact support if you'd like to
          request a verification check for your business.
        </p>
      </div>

      {isError ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed py-12 text-center">
          <ShieldAlert className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Failed to load verification records.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Try again
          </Button>
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
      ) : records.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed py-16 text-center">
          <ShieldCheck className="h-10 w-10 text-muted-foreground/30" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">No verifications yet</p>
            <p className="mt-1 text-xs text-muted-foreground/70 max-w-xs mx-auto">
              Verification records will appear here once the Fashion Nigeria team initiates a review
              of your business.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <ScoreSummary records={records} />

          {(verified.length > 0 || pending.length > 0 || rejected.length > 0) && (
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border bg-card p-3 text-center">
                <p className="text-xl font-bold text-emerald-600">{verified.length}</p>
                <p className="text-xs text-muted-foreground">Verified</p>
              </div>
              <div className="rounded-lg border bg-card p-3 text-center">
                <p className="text-xl font-bold text-amber-600">{pending.length}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
              <div className="rounded-lg border bg-card p-3 text-center">
                <p className="text-xl font-bold text-red-600">{rejected.length}</p>
                <p className="text-xs text-muted-foreground">Rejected</p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Verification history
            </p>
            {records.map((r) => (
              <VerificationCard key={r.id} record={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
