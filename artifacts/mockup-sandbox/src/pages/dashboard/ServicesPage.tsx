import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListServices,
  useCreateService,
  useUpdateService,
  useDeleteService,
  usePresignBusinessMediaUpload,
  useListCategories,
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
import { Wrench, Pencil, Trash2, Plus, Clock, Upload, X, Search, ImageOff } from 'lucide-react';

interface ServiceFormState {
  name: string;
  description: string;
  priceFrom: string;
  priceTo: string;
  imageUrl: string;
  durationMinutes: string;
  availability: string;
  status: 'active' | 'draft';
  categoryId: string;
  sortOrder: number;
}

const emptyForm = (): ServiceFormState => ({
  name: '',
  description: '',
  priceFrom: '',
  priceTo: '',
  imageUrl: '',
  durationMinutes: '',
  availability: '',
  status: 'active',
  categoryId: '',
  sortOrder: 0,
});

function serviceToForm(s: ServiceSummary): ServiceFormState {
  return {
    name: s.name,
    description: s.description ?? '',
    priceFrom: s.priceFrom ?? '',
    priceTo: s.priceTo ?? '',
    imageUrl: (s as any).imageUrl ?? '',
    durationMinutes: s.durationMinutes != null ? String(s.durationMinutes) : '',
    availability: s.availability ?? '',
    status: (s.status === 'draft' ? 'draft' : 'active') as ServiceFormState['status'],
    categoryId: (s as any).categoryId ?? '',
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

function ImageUploadField({
  imageUrl,
  localPreview,
  onUrlChange,
  onFileSelect,
  onClear,
}: {
  imageUrl: string;
  localPreview: string | null;
  onUrlChange: (url: string) => void;
  onFileSelect: (file: File) => void;
  onClear: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewSrc = localPreview ?? (imageUrl || null);

  return (
    <div className="space-y-2">
      <Label>Service image</Label>
      {previewSrc && (
        <div className="relative inline-block">
          <img
            src={previewSrc}
            alt="Service preview"
            className="h-28 w-28 rounded-lg border object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
          <button
            type="button"
            onClick={onClear}
            className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      <div className="flex gap-2">
        <Input
          value={imageUrl}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="Paste image URL…"
          className="flex-1 text-sm"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mr-1.5 h-3.5 w-3.5" />
          Browse
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Paste a URL or upload a file. In production, files are stored in cloud storage.
      </p>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelect(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}

export default function ServicesPage() {
  const queryClient = useQueryClient();
  const { businessId } = useDashboard();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceSummary | null>(null);
  const [form, setForm] = useState<ServiceFormState>(emptyForm());
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ServiceSummary | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft'>('all');

  const servicesQK = ['services', businessId, 'all'];

  const { data: servicesData, isLoading } = useListServices(
    businessId ?? '',
    { marketplace: MARKETPLACE_SLUG, status: ListServicesStatus.all },
    { query: { enabled: !!businessId, queryKey: servicesQK } },
  );

  const { data: categoriesData } = useListCategories();

  const categories = (categoriesData as { data?: Array<{ id: string; name: string; slug: string }> } | undefined)?.data ?? [];

  const allServices: ServiceSummary[] = (servicesData as { data?: ServiceSummary[] } | undefined)?.data ?? [];

  const filteredServices = allServices.filter((s) => {
    const matchesSearch =
      !searchQuery ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description ?? '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();
  const presign = usePresignBusinessMediaUpload();

  function openAdd() {
    setEditingService(null);
    setForm(emptyForm());
    setLocalPreview(null);
    setPendingFile(null);
    setSheetOpen(true);
  }

  function openEdit(s: ServiceSummary) {
    setEditingService(s);
    setForm(serviceToForm(s));
    setLocalPreview(null);
    setPendingFile(null);
    setSheetOpen(true);
  }

  function handleFileSelect(file: File) {
    const preview = URL.createObjectURL(file);
    setLocalPreview(preview);
    setPendingFile(file);
    setForm((f) => ({ ...f, imageUrl: '' }));
  }

  function handleClearImage() {
    if (localPreview) {
      URL.revokeObjectURL(localPreview);
    }
    setLocalPreview(null);
    setPendingFile(null);
    setForm((f) => ({ ...f, imageUrl: '' }));
  }

  async function resolveImageUrl(): Promise<string | undefined> {
    if (pendingFile && businessId) {
      try {
        const result = await presign.mutateAsync({
          businessId,
          data: { fileName: pendingFile.name, mimeType: pendingFile.type, purpose: 'gallery' },
          params: { marketplace: MARKETPLACE_SLUG },
        });
        const storageKey = (result as any)?.data?.storageKey ?? (result as any)?.storageKey;
        if (storageKey) return storageKey;
      } catch {
        toast.error('Image upload failed; service will be saved without image');
      }
      return undefined;
    }
    return form.imageUrl.trim() || undefined;
  }

  async function handleSave() {
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

    const imageUrl = await resolveImageUrl();

    const input: ServiceInput = {
      name,
      description: form.description.trim() || undefined,
      priceFrom: form.priceFrom.trim() || undefined,
      priceTo: form.priceTo.trim() || undefined,
      imageUrl,
      durationMinutes: durationParsed,
      availability: form.availability.trim() || undefined,
      status: form.status,
      categoryId: form.categoryId || undefined,
      sortOrder: form.sortOrder,
    };

    const onSuccess = () => {
      queryClient.invalidateQueries({ queryKey: servicesQK });
      setSheetOpen(false);
      if (localPreview) URL.revokeObjectURL(localPreview);
      setLocalPreview(null);
      setPendingFile(null);
    };

    const onError = (err: unknown) => {
      const e = err as { message?: string };
      toast.error(e.message ?? (editingService ? 'Failed to update service' : 'Failed to add service'));
    };

    if (editingService) {
      updateService.mutate(
        { businessId, id: editingService.id, data: input, params: { marketplace: MARKETPLACE_SLUG } },
        {
          onSuccess: () => { toast.success('Service updated'); onSuccess(); },
          onError,
        },
      );
    } else {
      createService.mutate(
        { businessId, data: input, params: { marketplace: MARKETPLACE_SLUG } },
        {
          onSuccess: () => { toast.success('Service added'); onSuccess(); },
          onError,
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

  const isSaving = createService.isPending || updateService.isPending || presign.isPending;

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

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search services…"
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active only</SelectItem>
              <SelectItem value="draft">Draft only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
            <Wrench className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-medium">
              {allServices.length === 0 ? 'No services yet' : 'No services match your filters'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {allServices.length === 0
                ? 'Add the services you provide to customers'
                : 'Try adjusting your search or status filter'}
            </p>
            {allServices.length === 0 && (
              <Button className="mt-4" onClick={openAdd}>
                <Plus className="mr-2 h-4 w-4" />
                Add service
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredServices.map((s) => {
              const priceStr = formatPriceRange(s.priceFrom, s.priceTo);
              const imgUrl = (s as any).imageUrl as string | null | undefined;
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-md border bg-card p-4 gap-4"
                >
                  {imgUrl ? (
                    <img
                      src={imgUrl}
                      alt={s.name}
                      className="h-14 w-14 shrink-0 rounded-md border object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border bg-muted/40">
                      <ImageOff className="h-5 w-5 text-muted-foreground/40" />
                    </div>
                  )}
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
                  <div className="flex shrink-0 items-center gap-2">
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

            <ImageUploadField
              imageUrl={form.imageUrl}
              localPreview={localPreview}
              onUrlChange={(url) => {
                setForm((f) => ({ ...f, imageUrl: url }));
                if (localPreview) {
                  URL.revokeObjectURL(localPreview);
                  setLocalPreview(null);
                  setPendingFile(null);
                }
              }}
              onFileSelect={handleFileSelect}
              onClear={handleClearImage}
            />

            {categories.length > 0 && (
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={form.categoryId || 'none'}
                  onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v === 'none' ? '' : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

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
