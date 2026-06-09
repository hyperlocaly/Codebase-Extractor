import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  usePresignBusinessMediaUpload,
  useListCategories,
  ListProductsStatus,
} from '@workspace/api-client-react';
import type { ProductSummary, ProductInput } from '@workspace/api-client-react';
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
import { Package, Pencil, Trash2, Plus, Upload, X, Search, ImageOff } from 'lucide-react';

interface ProductFormState {
  name: string;
  description: string;
  price: string;
  unit: string;
  imageUrl: string;
  stockStatus: 'in_stock' | 'out_of_stock' | 'made_to_order';
  status: 'active' | 'draft';
  categoryId: string;
  sortOrder: number;
}

const emptyForm = (): ProductFormState => ({
  name: '',
  description: '',
  price: '',
  unit: '',
  imageUrl: '',
  stockStatus: 'in_stock',
  status: 'active',
  categoryId: '',
  sortOrder: 0,
});

function productToForm(p: ProductSummary): ProductFormState {
  return {
    name: p.name,
    description: p.description ?? '',
    price: p.price ?? '',
    unit: p.unit ?? '',
    imageUrl: (p as any).imageUrl ?? '',
    stockStatus: (p.stockStatus as ProductFormState['stockStatus']) ?? 'in_stock',
    status: (p.status === 'draft' ? 'draft' : 'active') as ProductFormState['status'],
    categoryId: (p as any).categoryId ?? '',
    sortOrder: p.sortOrder ?? 0,
  };
}

const STOCK_STATUS_LABELS: Record<string, string> = {
  in_stock: 'In stock',
  out_of_stock: 'Out of stock',
  made_to_order: 'Made to order',
};

const STOCK_STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  in_stock: 'default',
  out_of_stock: 'destructive',
  made_to_order: 'secondary',
};

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
      <Label>Product image</Label>
      {previewSrc && (
        <div className="relative inline-block">
          <img
            src={previewSrc}
            alt="Product preview"
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

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const { businessId } = useDashboard();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductSummary | null>(null);
  const [form, setForm] = useState<ProductFormState>(emptyForm());
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductSummary | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft'>('all');

  const productsQK = ['products', businessId, 'all'];

  const { data: productsData, isLoading } = useListProducts(
    businessId ?? '',
    { marketplace: MARKETPLACE_SLUG, status: ListProductsStatus.all },
    { query: { enabled: !!businessId, queryKey: productsQK } },
  );

  const { data: categoriesData } = useListCategories();

  const categories = (categoriesData as { data?: Array<{ id: string; name: string; slug: string }> } | undefined)?.data ?? [];

  const allProducts: ProductSummary[] = (productsData as { data?: ProductSummary[] } | undefined)?.data ?? [];

  const filteredProducts = allProducts.filter((p) => {
    const matchesSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description ?? '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const presign = usePresignBusinessMediaUpload();

  function openAdd() {
    setEditingProduct(null);
    setForm(emptyForm());
    setLocalPreview(null);
    setPendingFile(null);
    setSheetOpen(true);
  }

  function openEdit(p: ProductSummary) {
    setEditingProduct(p);
    setForm(productToForm(p));
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
        toast.error('Image upload failed; product will be saved without image');
      }
      return undefined;
    }
    return form.imageUrl.trim() || undefined;
  }

  async function handleSave() {
    if (!businessId) return;

    const name = form.name.trim();
    if (!name) {
      toast.error('Product name is required');
      return;
    }

    const imageUrl = await resolveImageUrl();

    const input: ProductInput = {
      name,
      description: form.description.trim() || undefined,
      price: form.price.trim() || undefined,
      unit: form.unit.trim() || undefined,
      imageUrl,
      stockStatus: form.stockStatus,
      status: form.status,
      categoryId: form.categoryId || undefined,
      sortOrder: form.sortOrder,
    };

    const onSuccess = () => {
      queryClient.invalidateQueries({ queryKey: productsQK });
      setSheetOpen(false);
      if (localPreview) URL.revokeObjectURL(localPreview);
      setLocalPreview(null);
      setPendingFile(null);
    };

    const onError = (err: unknown) => {
      const e = err as { message?: string };
      toast.error(e.message ?? (editingProduct ? 'Failed to update product' : 'Failed to add product'));
    };

    if (editingProduct) {
      updateProduct.mutate(
        { businessId, id: editingProduct.id, data: input, params: { marketplace: MARKETPLACE_SLUG } },
        {
          onSuccess: () => { toast.success('Product updated'); onSuccess(); },
          onError,
        },
      );
    } else {
      createProduct.mutate(
        { businessId, data: input, params: { marketplace: MARKETPLACE_SLUG } },
        {
          onSuccess: () => { toast.success('Product added'); onSuccess(); },
          onError,
        },
      );
    }
  }

  function handleDelete() {
    if (!businessId || !deleteTarget) return;
    deleteProduct.mutate(
      { businessId, id: deleteTarget.id, params: { marketplace: MARKETPLACE_SLUG } },
      {
        onSuccess: () => {
          toast.success('Product deleted');
          queryClient.invalidateQueries({ queryKey: productsQK });
          setDeleteTarget(null);
        },
        onError: (err) => {
          const e = err as { message?: string };
          toast.error(e.message ?? 'Failed to delete product');
        },
      },
    );
  }

  const isSaving = createProduct.isPending || updateProduct.isPending || presign.isPending;

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Products</h1>
            <p className="text-sm text-muted-foreground">
              Manage the products you offer to customers
            </p>
          </div>
          <Button onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Add product
          </Button>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products…"
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
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
            <Package className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-medium">
              {allProducts.length === 0 ? 'No products yet' : 'No products match your filters'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {allProducts.length === 0
                ? 'Add products to showcase what you sell'
                : 'Try adjusting your search or status filter'}
            </p>
            {allProducts.length === 0 && (
              <Button className="mt-4" onClick={openAdd}>
                <Plus className="mr-2 h-4 w-4" />
                Add product
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredProducts.map((p) => {
              const imgUrl = (p as any).imageUrl as string | null | undefined;
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-md border bg-card p-4 gap-4"
                >
                  {imgUrl ? (
                    <img
                      src={imgUrl}
                      alt={p.name}
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
                      <span className="font-medium">{p.name}</span>
                      <Badge
                        variant={p.status === 'active' ? 'default' : 'outline'}
                        className="text-xs"
                      >
                        {p.status === 'active' ? 'Active' : 'Draft'}
                      </Badge>
                      <Badge
                        variant={STOCK_STATUS_VARIANTS[p.stockStatus] ?? 'secondary'}
                        className="text-xs"
                      >
                        {STOCK_STATUS_LABELS[p.stockStatus] ?? p.stockStatus}
                      </Badge>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-3">
                      {p.price && (
                        <span className="text-sm font-semibold text-foreground">
                          ₦{Number(p.price).toLocaleString()}
                          {p.unit ? <span className="font-normal text-muted-foreground"> / {p.unit}</span> : null}
                        </span>
                      )}
                      {p.description && (
                        <p className="max-w-sm truncate text-sm text-muted-foreground">
                          {p.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(p)}
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
            <SheetTitle>{editingProduct ? 'Edit product' : 'Add product'}</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Ankara Dress"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Brief description of the product…"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Price (₦)</Label>
                <Input
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="e.g. 15000.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Input
                  value={form.unit}
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                  placeholder="e.g. piece, yard"
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

            <div className="space-y-2">
              <Label>Stock status</Label>
              <Select
                value={form.stockStatus}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, stockStatus: v as ProductFormState['stockStatus'] }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_stock">In stock</SelectItem>
                  <SelectItem value="out_of_stock">Out of stock</SelectItem>
                  <SelectItem value="made_to_order">Made to order</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Visibility</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, status: v as ProductFormState['status'] }))
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

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setSheetOpen(false)}
              >
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving…' : editingProduct ? 'Update' : 'Add'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product?</AlertDialogTitle>
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
              disabled={deleteProduct.isPending}
            >
              {deleteProduct.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
