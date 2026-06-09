import {
  useListBusinessVerifications,
  useGetVerificationTypes,
  getListBusinessVerificationsQueryKey,
  getGetVerificationTypesQueryKey,
} from '@workspace/api-client-react';
import type { GetVerificationTypes200 } from '@workspace/api-client-react';
import { useDashboard } from '@/providers/DashboardProvider';
import { MARKETPLACE_SLUG } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
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
  Circle,
} from 'lucide-react';

interface VerificationApiType {
  id: string;
  code?: string;
  label?: string;
  description?: string;
  scoreWeight?: number;
  isRequired?: boolean;
}

interface VerificationRecord {
  id: string;
  status: string;
  verifiedAt?: string | null;
  expiresAt?: string | null;
  evidenceUrl?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  verificationType: {
    id: string;
    code?: string;
    name?: string;
    description?: string;
    weight?: number;
  };
}

const STATUS_CONFIG: Record<string, {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: React.ReactNode;
}> = {
  not_started: {
    label: 'Not started',
    color: 'text-muted-foreground',
    bg: 'bg-card',
    border: 'border',
    icon: <Circle className="h-4 w-4 text-muted-foreground/40" />,
  },
  pending: {
    label: 'Pending review',
    color: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
    icon: <Clock className="h-4 w-4 text-amber-500" />,
  },
  in_progress: {
    label: 'In progress',
    color: 'text-blue-700 dark:text-blue-300',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    icon: <AlertCircle className="h-4 w-4 text-blue-500" />,
  },
  verified: {
    label: 'Verified',
    color: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    border: 'border-emerald-200 dark:border-emerald-800',
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  },
  rejected: {
    label: 'Rejected',
    color: 'text-red-700 dark:text-red-300',
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    icon: <XCircle className="h-4 w-4 text-red-500" />,
  },
  expired: {
    label: 'Expired',
    color: 'text-slate-600 dark:text-slate-400',
    bg: 'bg-slate-100 dark:bg-slate-800',
    border: 'border-slate-200 dark:border-slate-700',
    icon: <ShieldOff className="h-4 w-4 text-slate-400" />,
  },
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] ?? {
    label: status,
    color: 'text-muted-foreground',
    bg: 'bg-muted',
    border: 'border',
    icon: <AlertCircle className="h-4 w-4 text-muted-foreground" />,
  };
}

function formatDate(d: string | null | undefined): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function VerificationTypeCard({
  type,
  record,
}: {
  type: VerificationApiType;
  record: VerificationRecord | undefined;
}) {
  const isExpired = record?.expiresAt && new Date(record.expiresAt) < new Date();
  const rawStatus = record ? record.status : 'not_started';
  const effectiveStatus = isExpired && rawStatus === 'verified' ? 'expired' : rawStatus;
  const cfg = getStatusConfig(effectiveStatus);

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${cfg.bg} ${cfg.border}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {cfg.icon}
          <span className="text-sm font-semibold truncate">
            {type.label ?? type.code ?? 'Verification'}
          </span>
          {type.isRequired && (
            <Badge variant="outline" className="shrink-0 text-xs border-red-300 text-red-600">
              Required
            </Badge>
          )}
        </div>
        <span className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color} ${cfg.bg} border ${cfg.border}`}>
          {cfg.label}
        </span>
      </div>

      {type.description && (
        <p className="text-xs text-muted-foreground">{type.description}</p>
      )}

      {record && (
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
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        {type.scoreWeight !== undefined && type.scoreWeight > 0 && (
          <span className="text-xs text-muted-foreground">
            Score weight: <span className="font-medium text-foreground">{type.scoreWeight}%</span>
          </span>
        )}
        {record?.evidenceUrl && (
          <a
            href={record.evidenceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline"
          >
            View evidence ↗
          </a>
        )}
      </div>
    </div>
  );
}

function ScoreSummary({
  types,
  records,
}: {
  types: VerificationApiType[];
  records: VerificationRecord[];
}) {
  const recordsByTypeId = new Map(records.map((r) => [r.verificationType.id, r]));

  const totalWeight = types.reduce((sum, t) => sum + (t.scoreWeight ?? 0), 0);
  const earnedWeight = types.reduce((sum, t) => {
    const rec = recordsByTypeId.get(t.id);
    if (!rec || rec.status !== 'verified') return sum;
    const isExpired = rec.expiresAt && new Date(rec.expiresAt) < new Date();
    if (isExpired) return sum;
    return sum + (t.scoreWeight ?? 0);
  }, 0);

  const verifiedCount = records.filter((r) => {
    const isExpired = r.expiresAt && new Date(r.expiresAt) < new Date();
    return r.status === 'verified' && !isExpired;
  }).length;

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
        {verifiedCount} of {types.length} verification{types.length !== 1 ? 's' : ''} active ·{' '}
        {earnedWeight} of {totalWeight} weight points earned
      </p>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-20 w-full rounded-xl" />
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-28 w-full rounded-xl" />
      ))}
    </div>
  );
}

export default function VerificationPage() {
  const { businessId } = useDashboard();

  const listParams = { marketplace: MARKETPLACE_SLUG };

  const {
    data: recordsData,
    isLoading: isRecordsLoading,
    isError: isRecordsError,
    refetch: refetchRecords,
  } = useListBusinessVerifications(businessId ?? '', listParams, {
    query: {
      enabled: !!businessId,
      queryKey: getListBusinessVerificationsQueryKey(businessId ?? '', listParams),
    },
  });

  const {
    data: typesData,
    isLoading: isTypesLoading,
    isError: isTypesError,
    refetch: refetchTypes,
  } = useGetVerificationTypes(businessId ?? '', listParams, {
    query: {
      enabled: !!businessId,
      queryKey: getGetVerificationTypesQueryKey(businessId ?? '', listParams),
    },
  });

  const records = ((recordsData as any)?.data ?? []) as VerificationRecord[];
  const apiTypes = ((typesData as GetVerificationTypes200 & { data?: VerificationApiType[] })?.data ??
    []) as VerificationApiType[];

  const recordsByTypeId = new Map(records.map((r) => [r.verificationType.id, r]));

  const isLoading = isRecordsLoading || isTypesLoading;
  const isError = isRecordsError || isTypesError;

  const verified = records.filter((r) => {
    const isExpired = r.expiresAt && new Date(r.expiresAt) < new Date();
    return r.status === 'verified' && !isExpired;
  });
  const pending = records.filter((r) => r.status === 'pending' || r.status === 'in_progress');
  const rejected = records.filter((r) => r.status === 'rejected');

  function handleRetry() {
    if (isRecordsError) refetchRecords();
    if (isTypesError) refetchTypes();
  }

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
          <p className="text-sm text-muted-foreground">Failed to load verification data.</p>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Try again
          </Button>
        </div>
      ) : isLoading ? (
        <PageSkeleton />
      ) : apiTypes.length === 0 && records.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed py-16 text-center">
          <ShieldCheck className="h-10 w-10 text-muted-foreground/30" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">No verifications available</p>
            <p className="mt-1 text-xs text-muted-foreground/70 max-w-xs mx-auto">
              Verification types and records will appear here once the Fashion Nigeria team sets them
              up for your marketplace.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {apiTypes.length > 0 && (
            <ScoreSummary types={apiTypes} records={records} />
          )}

          {records.length > 0 && (
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

          {apiTypes.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Available verifications
              </p>
              {apiTypes.map((type) => (
                <VerificationTypeCard
                  key={type.id}
                  type={type}
                  record={recordsByTypeId.get(type.id)}
                />
              ))}
            </div>
          ) : records.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Verification history
              </p>
              {records.map((r) => (
                <VerificationTypeCard
                  key={r.id}
                  type={{
                    id: r.verificationType.id,
                    code: r.verificationType.code,
                    label: r.verificationType.name,
                    description: r.verificationType.description,
                    scoreWeight: r.verificationType.weight,
                  }}
                  record={r}
                />
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
