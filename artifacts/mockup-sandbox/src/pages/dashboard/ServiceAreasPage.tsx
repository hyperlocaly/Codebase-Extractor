import { useState } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListBusinessServiceAreas,
  useAddBusinessServiceArea,
  useDeleteBusinessServiceArea,
  useSearchLocations,
  getListBusinessServiceAreasQueryKey,
  getSearchLocationsQueryKey,
} from '@workspace/api-client-react';
import type { LocationSummary } from '@workspace/api-client-react';
import { useDashboard } from '@/providers/DashboardProvider';
import { MARKETPLACE_SLUG } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Globe, Trash2, Plus, Search, MapPin, X } from 'lucide-react';

interface ServiceAreaItem {
  id: string;
  radiusKm?: string | null;
  createdAt: string;
  location: {
    id: string;
    name: string;
    slug: string;
    fullName?: string | null;
    levelNumber: number;
  };
}

function LocationSearch({
  onSelect,
}: {
  onSelect: (loc: LocationSummary) => void;
}) {
  const [q, setQ] = useState('');

  const searchParams = { q, country: 'NG' };
  const { data } = useSearchLocations(searchParams, {
    query: {
      enabled: q.length >= 2,
      queryKey: getSearchLocationsQueryKey(searchParams),
    },
  });

  const results: LocationSummary[] = (data as any)?.data ?? [];

  function select(loc: LocationSummary) {
    onSelect(loc);
    setQ('');
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by state, LGA, or town…"
          className="pl-8"
        />
        {q && (
          <button
            type="button"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setQ('')}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {q.length >= 2 && (
        <div className="max-h-52 overflow-y-auto rounded-md border bg-popover shadow-md">
          {results.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">No locations found.</p>
          ) : (
            results.map((loc) => (
              <button
                key={loc.id}
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                onClick={() => select(loc)}
              >
                <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{loc.fullName ?? loc.name}</span>
                <span className="shrink-0 text-[10px] text-muted-foreground/60">
                  {loc.levelNumber === 1 ? 'State' : loc.levelNumber === 2 ? 'LGA' : 'Town'}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const LEVEL_LABEL: Record<number, string> = {
  1: 'State',
  2: 'LGA',
  3: 'Town / City',
};

function AreaRow({
  area,
  onDelete,
}: {
  area: ServiceAreaItem;
  onDelete: (a: ServiceAreaItem) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{area.location.fullName ?? area.location.name}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
          <span>{LEVEL_LABEL[area.location.levelNumber] ?? `Level ${area.location.levelNumber}`}</span>
          {area.radiusKm && <span>· {area.radiusKm} km radius</span>}
        </div>
      </div>
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
        onClick={() => onDelete(area)}
        title="Remove"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export default function ServiceAreasPage() {
  const { businessId } = useDashboard();
  const qc = useQueryClient();

  const [pending, setPending] = useState<LocationSummary | null>(null);
  const [radiusKm, setRadiusKm] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ServiceAreaItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const listParams = { marketplace: MARKETPLACE_SLUG };

  const { data, isLoading, isError, refetch } = useListBusinessServiceAreas(
    businessId ?? '',
    listParams,
    {
      query: {
        enabled: !!businessId,
        queryKey: getListBusinessServiceAreasQueryKey(businessId ?? '', listParams),
      },
    },
  );

  const { mutateAsync: addArea } = useAddBusinessServiceArea();
  const { mutateAsync: deleteArea } = useDeleteBusinessServiceArea();

  const invalidate = () =>
    qc.invalidateQueries({
      queryKey: getListBusinessServiceAreasQueryKey(businessId ?? '', listParams),
    });

  const areas = ((data as any)?.data ?? []) as ServiceAreaItem[];

  function handleSelect(loc: LocationSummary) {
    const alreadyAdded = areas.some((a) => a.location.id === loc.id);
    if (alreadyAdded) {
      toast.info(`${loc.fullName ?? loc.name} is already in your service areas.`);
      return;
    }
    setPending(loc);
    setRadiusKm('');
  }

  async function handleAdd() {
    if (!businessId || !pending) return;
    setIsAdding(true);
    try {
      await addArea({
        businessId,
        data: {
          locationId: pending.id,
          ...(radiusKm.trim() ? { radiusKm: radiusKm.trim() } : {}),
        },
        params: { marketplace: MARKETPLACE_SLUG },
      });
      toast.success(`${pending.fullName ?? pending.name} added`);
      setPending(null);
      setRadiusKm('');
      await invalidate();
    } catch {
      toast.error('Failed to add service area. Please try again.');
    } finally {
      setIsAdding(false);
    }
  }

  async function handleDelete() {
    if (!businessId || !deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteArea({
        businessId,
        areaId: deleteTarget.id,
        params: { marketplace: MARKETPLACE_SLUG },
      });
      toast.success('Service area removed');
      setDeleteTarget(null);
      await invalidate();
    } catch {
      toast.error('Failed to remove service area.');
    } finally {
      setIsDeleting(false);
    }
  }

  if (!businessId) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center px-4">
        <Globe className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No business found. Create your business first.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-xl font-bold">Service Areas</h1>
        <p className="text-sm text-muted-foreground">
          Define the locations where your business delivers or provides services.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-3">
        <p className="text-sm font-medium flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add a service area
        </p>
        <LocationSearch onSelect={handleSelect} />

        {pending && (
          <div className="rounded-lg border bg-muted/40 p-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{pending.fullName ?? pending.name}</span>
                <span className="text-xs text-muted-foreground/60">
                  {LEVEL_LABEL[pending.levelNumber] ?? `Level ${pending.levelNumber}`}
                </span>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => setPending(null)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sa-radius" className="text-xs">
                Service radius (km) — optional
              </Label>
              <Input
                id="sa-radius"
                value={radiusKm}
                onChange={(e) => setRadiusKm(e.target.value)}
                placeholder="e.g. 25"
                className="h-8 text-sm"
                type="number"
                min="0"
              />
            </div>

            <Button size="sm" onClick={handleAdd} disabled={isAdding}>
              {isAdding ? 'Adding…' : 'Confirm and add'}
            </Button>
          </div>
        )}
      </div>

      {isError ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed py-12 text-center">
          <Globe className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Failed to load service areas.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Try again</Button>
        </div>
      ) : isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
        </div>
      ) : areas.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed py-12 text-center">
          <Globe className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No service areas defined yet.</p>
          <p className="text-xs text-muted-foreground/70">
            Add the states, LGAs, or towns you serve to help customers find you.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{areas.length} area{areas.length !== 1 ? 's' : ''} covered</p>
          {areas.map((a) => (
            <AreaRow key={a.id} area={a} onDelete={setDeleteTarget} />
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this service area?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.location.fullName ?? deleteTarget?.location.name}" will be removed from your service areas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Removing…' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
