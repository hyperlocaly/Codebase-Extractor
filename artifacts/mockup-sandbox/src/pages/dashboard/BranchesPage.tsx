import { useState } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListBusinessBranches,
  useCreateBusinessBranch,
  useUpdateBusinessBranch,
  useDeleteBusinessBranch,
  useSearchLocations,
  getListBusinessBranchesQueryKey,
  getSearchLocationsQueryKey,
} from '@workspace/api-client-react';
import type { LocationSummary } from '@workspace/api-client-react';
import { useDashboard } from '@/providers/DashboardProvider';
import { MARKETPLACE_SLUG } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
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
  MapPin,
  Pencil,
  Trash2,
  Plus,
  Star,
  Building2,
  Search,
  ChevronDown,
  X,
} from 'lucide-react';

interface Branch {
  id: string;
  businessId: string;
  name: string;
  locationId?: string | null;
  addressLine1?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  isPrimary: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

interface BranchFormState {
  name: string;
  addressLine1: string;
  locationId: string;
  locationDisplay: string;
  isPrimary: boolean;
}

const emptyForm = (): BranchFormState => ({
  name: '',
  addressLine1: '',
  locationId: '',
  locationDisplay: '',
  isPrimary: false,
});

function branchToForm(b: Branch): BranchFormState {
  return {
    name: b.name,
    addressLine1: b.addressLine1 ?? '',
    locationId: b.locationId ?? '',
    locationDisplay: '',
    isPrimary: b.isPrimary,
  };
}

function LocationPicker({
  value,
  displayValue,
  onChange,
}: {
  value: string;
  displayValue: string;
  onChange: (id: string, display: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const searchParams = { q, country: 'NG' };
  const { data } = useSearchLocations(searchParams, {
    query: {
      enabled: q.length >= 2,
      queryKey: getSearchLocationsQueryKey(searchParams),
    },
  });

  const locations: LocationSummary[] = (data as any)?.data ?? [];

  function select(loc: LocationSummary) {
    onChange(loc.id, loc.fullName ?? loc.name);
    setOpen(false);
    setQ('');
  }

  function clear() {
    onChange('', '');
  }

  if (!open) {
    return (
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1 justify-start text-sm font-normal truncate"
          onClick={() => setOpen(true)}
        >
          <MapPin className="mr-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">
            {displayValue || value ? displayValue || 'Selected location' : 'Search location…'}
          </span>
          <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={clear}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Type state, LGA, or town…"
          className="pl-8"
        />
      </div>
      {q.length >= 2 && (
        <div className="max-h-52 overflow-y-auto rounded-md border bg-popover shadow-md">
          {locations.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">No locations found.</p>
          ) : (
            locations.map((loc) => (
              <button
                key={loc.id}
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                onClick={() => select(loc)}
              >
                <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{loc.fullName ?? loc.name}</span>
                <span className="ml-auto shrink-0 text-[10px] text-muted-foreground/60">
                  L{loc.levelNumber}
                </span>
              </button>
            ))
          )}
        </div>
      )}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 text-xs"
        onClick={() => { setOpen(false); setQ(''); }}
      >
        Cancel
      </Button>
    </div>
  );
}

interface BranchFormFieldsProps {
  form: BranchFormState;
  onChange: (f: BranchFormState) => void;
}

function BranchFormFields({ form, onChange }: BranchFormFieldsProps) {
  const set = <K extends keyof BranchFormState>(k: K, v: BranchFormState[K]) =>
    onChange({ ...form, [k]: v });

  return (
    <div className="space-y-4 py-2">
      <div className="space-y-1.5">
        <Label htmlFor="b-name">Branch name *</Label>
        <Input
          id="b-name"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="e.g. Victoria Island Branch"
          maxLength={120}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Location</Label>
        <LocationPicker
          value={form.locationId}
          displayValue={form.locationDisplay}
          onChange={(id, display) => onChange({ ...form, locationId: id, locationDisplay: display })}
        />
        <p className="text-xs text-muted-foreground">State, LGA, or town where this branch is located.</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="b-addr">Street address</Label>
        <Input
          id="b-addr"
          value={form.addressLine1}
          onChange={(e) => set('addressLine1', e.target.value)}
          placeholder="e.g. 12 Adeola Odeku Street"
          maxLength={200}
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border px-4 py-3">
        <div>
          <p className="text-sm font-medium">Primary branch</p>
          <p className="text-xs text-muted-foreground">Mark as your main location</p>
        </div>
        <Switch
          checked={form.isPrimary}
          onCheckedChange={(v) => set('isPrimary', v)}
        />
      </div>
    </div>
  );
}

interface BranchRowProps {
  branch: Branch;
  onEdit: (b: Branch) => void;
  onDelete: (b: Branch) => void;
}

function BranchRow({ branch, onEdit, onDelete }: BranchRowProps) {
  return (
    <div className="flex items-start gap-4 rounded-xl border bg-card p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Building2 className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">{branch.name}</span>
          {branch.isPrimary && (
            <Badge variant="secondary" className="gap-1 text-[10px]">
              <Star className="h-2.5 w-2.5 fill-current" />
              Primary
            </Badge>
          )}
        </div>
        {branch.addressLine1 && (
          <p className="text-xs text-muted-foreground">{branch.addressLine1}</p>
        )}
        <p className="text-[11px] text-muted-foreground/60">
          Added {new Date(branch.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      </div>
      <div className="flex shrink-0 gap-1">
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(branch)} title="Edit">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => onDelete(branch)}
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function BranchesPage() {
  const { businessId } = useDashboard();
  const qc = useQueryClient();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Branch | null>(null);
  const [form, setForm] = useState<BranchFormState>(emptyForm());
  const [isSaving, setIsSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const listParams = { marketplace: MARKETPLACE_SLUG };

  const { data, isLoading, isError, refetch } = useListBusinessBranches(
    businessId ?? '',
    listParams,
    {
      query: {
        enabled: !!businessId,
        queryKey: getListBusinessBranchesQueryKey(businessId ?? '', listParams),
      },
    },
  );

  const { mutateAsync: createBranch } = useCreateBusinessBranch();
  const { mutateAsync: updateBranch } = useUpdateBusinessBranch();
  const { mutateAsync: deleteBranch } = useDeleteBusinessBranch();

  const invalidate = () =>
    qc.invalidateQueries({
      queryKey: getListBusinessBranchesQueryKey(businessId ?? '', listParams),
    });

  const branches = ((data as any)?.data ?? []) as Branch[];

  function openCreate() {
    setEditTarget(null);
    setForm(emptyForm());
    setSheetOpen(true);
  }

  function openEdit(b: Branch) {
    setEditTarget(b);
    setForm(branchToForm(b));
    setSheetOpen(true);
  }

  async function handleSave() {
    if (!businessId || !form.name.trim()) return;
    setIsSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        ...(form.addressLine1.trim() ? { addressLine1: form.addressLine1.trim() } : {}),
        ...(form.locationId ? { locationId: form.locationId } : {}),
        isPrimary: form.isPrimary,
      };

      if (editTarget) {
        await updateBranch({
          businessId,
          branchId: editTarget.id,
          data: payload,
          params: { marketplace: MARKETPLACE_SLUG },
        });
        toast.success('Branch updated');
      } else {
        await createBranch({
          businessId,
          data: payload,
          params: { marketplace: MARKETPLACE_SLUG },
        });
        toast.success('Branch added');
      }
      setSheetOpen(false);
      await invalidate();
    } catch {
      toast.error('Failed to save branch. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!businessId || !deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteBranch({
        businessId,
        branchId: deleteTarget.id,
        params: { marketplace: MARKETPLACE_SLUG },
      });
      toast.success('Branch removed');
      setDeleteTarget(null);
      await invalidate();
    } catch {
      toast.error('Failed to remove branch.');
    } finally {
      setIsDeleting(false);
    }
  }

  if (!businessId) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center px-4">
        <Building2 className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No business found. Create your business first.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Branches</h1>
          <p className="text-sm text-muted-foreground">
            Manage additional locations where your business operates.
          </p>
        </div>
        <Button onClick={openCreate} className="shrink-0">
          <Plus className="mr-1.5 h-4 w-4" />
          Add branch
        </Button>
      </div>

      {isError ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed py-12 text-center">
          <Building2 className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Failed to load branches.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Try again</Button>
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : branches.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed py-14 text-center">
          <Building2 className="h-9 w-9 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">No branches yet.</p>
          <p className="text-xs text-muted-foreground/70">
            Add branch locations to show customers where else they can find you.
          </p>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add your first branch
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {branches.map((b) => (
            <BranchRow key={b.id} branch={b} onEdit={openEdit} onDelete={setDeleteTarget} />
          ))}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editTarget ? 'Edit branch' : 'Add branch'}</SheetTitle>
          </SheetHeader>
          <BranchFormFields form={form} onChange={setForm} />
          <div className="mt-6 flex gap-2">
            <Button
              onClick={handleSave}
              disabled={isSaving || !form.name.trim()}
              className="flex-1"
            >
              {isSaving ? 'Saving…' : editTarget ? 'Save changes' : 'Add branch'}
            </Button>
            <Button variant="outline" onClick={() => setSheetOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this branch?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.name}" will be removed from your branch list.
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
