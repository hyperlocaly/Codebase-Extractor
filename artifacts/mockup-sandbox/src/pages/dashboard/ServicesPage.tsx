import { useState } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListServices,
  useCreateService,
  useUpdateService,
  useDeleteService,
  ListServicesStatus,
} from '@workspace/api-client-react';
import type { ServiceSummary, ServiceInput } from '@workspace/api-client-react';
import { useDashboard } from '@/providers/DashboardProvider';
import { MARKETPLACE_SLUG } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Wrench, Pencil, Trash2, Plus, Clock } from 'lucide-react';

interface ServiceFormState {
  name: string;
  description: string;
  priceFrom: string;
  priceTo: string;
  durationMinutes: string;
  availability: string;
  status: 'active' | 'draft';
  sortOrder: number;
}

const emptyForm = (): ServiceFormState => ({
  name: '',
  description: '',
  priceFrom: '',
  priceTo: '',
  durationMinutes: '',
  availability: '',
  status: 'active',
  sortOrder: 0,
});

function serviceToForm(s: ServiceSummary): ServiceFormState {
  return {
    name: s.name,
    description: s.description ?? '',
    priceFrom: s.priceFrom ?? '',
    priceTo: s.priceTo ?? '',
    durationMinutes: s.durationMinutes != null ? String(s.durationMinutes) : '',
    availability: s.availability ?? '',
    status: (s.status === 'draft' ? 'draft' : 'active') as ServiceFormState['status'],
    sortOrder: s.sortOrder ?? 0,
  };
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function formatPriceRange(priceFrom?: string | null, priceTo?: string | null): string {
  const from = priceFrom ? `₦${Number(priceFrom).toLocaleString()}` : null;
  const to = priceTo ? `₦${Number(priceTo).toLocaleString()}` : null;
  if (from && to) return `${from} – ${to}`;
  if (from) return `From ${from}`;
  if (to) return `Up to ${to}`;
  return '';
}

export default function ServicesPage() {
  const queryClient = useQueryClient();
  const { businessId } = useDashboard();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceSummary | null>(null);
  const [form, setForm] = useState<ServiceFormState>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<ServiceSummary | null>(null);

  const servicesQK = ['services', businessId, 'all'];

  const { data: servicesData, isLoading } = useListServices(
    businessId ?? '',
    { marketplace: MARKETPLACE_SLUG, status: ListServicesStatus.all },
    { query: { enabled: !!businessId, queryKey: servicesQK } },
  );

  const services: ServiceSummary[] = (servicesData as { data?: ServiceSummary[] } | undefined)?.data ?? [];

  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();

  function openAdd() {
    setEditingService(null);
    setForm(emptyForm());
    setSheetOpen(true);
  }

  function openEdit(s: ServiceSummary) {
    setEditingService(s);
    setForm(serviceToForm(s));
    setSheetOpen(true);
  }

  function handleSave() {
    if (!businessId) return;

    const name = form.name.trim();
    if (!name) {
      toast.error('Service name is required');
      return;
    }

    const durationParsed = form.durationMinutes.trim()
      ? parseInt(form.durationMinutes, 10)
      : undefined;

    if (form.durationMinutes.trim() && (isNaN(durationParsed!) || durationParsed! < 1)) {
      toast.error('Duration must be a positive number of minutes');
      return;
    }

    const input: ServiceInput = {
      name,
      description: form.description.trim() || undefined,
      priceFrom: form.priceFrom.trim() || undefined,
      priceTo: form.priceTo.trim() || undefined,
      durationMinutes: durationParsed,
      availability: form.availability.trim() || undefined,
      status: form.status,
      sortOrder: form.sortOrder,
    };

    if (editingService) {
      updateService.mutate(
        { businessId, id: editingService.id, data: input, params: { marketplace: MARKETPLACE_SLUG } },
        {
          onSuccess: () => {
            toast.success('Service updated');
            queryClient.invalidateQueries({ queryKey: servicesQK });
            setSheetOpen(false);
          },
          onError: (err) => {
            const e = err as { message?: string };
            toast.error(e.message ?? 'Failed to update service');
          },
        },
      );
    } else {
      createService.mutate(
        { businessId, data: input, params: { marketplace: MARKETPLACE_SLUG } },
        {
          onSuccess: () => {
            toast.success('Service added');
            queryClient.invalidateQueries({ queryKey: servicesQK });
            setSheetOpen(false);
          },
          onError: (err) => {
            const e = err as { message?: string };
            toast.error(e.message ?? 'Failed to add service');
          },
        },
      );
    }
  }

  function handleDelete() {
    if (!businessId || !deleteTarget) return;
    deleteService.mutate(
      { businessId, id: deleteTarget.id, params: { marketplace: MARKETPLACE_SLUG } },
      {
        onSuccess: () => {
          toast.success('Service deleted');
          queryClient.invalidateQueries({ queryKey: servicesQK });
          setDeleteTarget(null);
        },
        onError: (err) => {
          const e = err as { message?: string };
          toast.error(e.message ?? 'Failed to delete service');
        },
      },
    );
  }

  const isSaving = createService.isPending || updateService.isPending;

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Services</h1>
            <p className="text-sm text-muted-foreground">
              Manage the services you offer to customers
            </p>
          </div>
          <Button onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Add service
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : services.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
            <Wrench className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-medium">No services yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add the services you provide to customers
            </p>
            <Button className="mt-4" onClick={openAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Add service
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {services.map((s) => {
              const priceStr = formatPriceRange(s.priceFrom, s.priceTo);
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-md border bg-card p-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{s.name}</span>
                      <Badge
                        variant={s.status === 'active' ? 'default' : 'outline'}
                        className="text-xs"
                      >
                        {s.status === 'active' ? 'Active' : 'Draft'}
                      </Badge>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-3">
                      {priceStr && (
                        <span className="text-sm font-semibold text-foreground">{priceStr}</span>
                      )}
                      {s.durationMinutes != null && (
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDuration(s.durationMinutes)}
                        </span>
                      )}
                      {s.availability && (
                        <span className="text-sm text-muted-foreground">{s.availability}</span>
                      )}
                      {s.description && !s.availability && (
                        <p className="max-w-sm truncate text-sm text-muted-foreground">
                          {s.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="ml-4 flex shrink-0 items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(s)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingService ? 'Edit service' : 'Add service'}</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Ankara Tailoring"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Brief description of the service…"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Price from (₦)</Label>
                <Input
                  value={form.priceFrom}
                  onChange={(e) => setForm((f) => ({ ...f, priceFrom: e.target.value }))}
                  placeholder="e.g. 10000.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Price to (₦)</Label>
                <Input
                  value={form.priceTo}
                  onChange={(e) => setForm((f) => ({ ...f, priceTo: e.target.value }))}
                  placeholder="e.g. 25000.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.durationMinutes}
                  onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))}
                  placeholder="e.g. 60"
                />
              </div>
              <div className="space-y-2">
                <Label>Sort order</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sortOrder: parseInt(e.target.value, 10) || 0 }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Availability</Label>
              <Input
                value={form.availability}
                onChange={(e) => setForm((f) => ({ ...f, availability: e.target.value }))}
                placeholder="e.g. Mon–Fri, by appointment"
              />
            </div>

            <div className="space-y-2">
              <Label>Visibility</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, status: v as ServiceFormState['status'] }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active — visible to customers</SelectItem>
                  <SelectItem value="draft">Draft — hidden from customers</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setSheetOpen(false)}
              >
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving…' : editingService ? 'Update' : 'Add'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete service?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove{' '}
              <span className="font-medium">{deleteTarget?.name}</span> from your listings.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteService.isPending}
            >
              {deleteService.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
