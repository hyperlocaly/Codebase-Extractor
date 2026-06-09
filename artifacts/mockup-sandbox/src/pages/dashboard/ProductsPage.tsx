import { useState } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
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
import { Package, Pencil, Trash2, Plus } from 'lucide-react';

interface ProductFormState {
  name: string;
  description: string;
  price: string;
  unit: string;
  stockStatus: 'in_stock' | 'out_of_stock' | 'made_to_order';
  status: 'active' | 'draft';
  sortOrder: number;
}

const emptyForm = (): ProductFormState => ({
  name: '',
  description: '',
  price: '',
  unit: '',
  stockStatus: 'in_stock',
  status: 'active',
  sortOrder: 0,
});

function productToForm(p: ProductSummary): ProductFormState {
  return {
    name: p.name,
    description: p.description ?? '',
    price: p.price ?? '',
    unit: p.unit ?? '',
    stockStatus: (p.stockStatus as ProductFormState['stockStatus']) ?? 'in_stock',
    status: (p.status === 'draft' ? 'draft' : 'active') as ProductFormState['status'],
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

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const { businessId } = useDashboard();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductSummary | null>(null);
  const [form, setForm] = useState<ProductFormState>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<ProductSummary | null>(null);

  const productsQK = ['products', businessId, 'all'];

  const { data: productsData, isLoading } = useListProducts(
    businessId ?? '',
    { marketplace: MARKETPLACE_SLUG, status: ListProductsStatus.all },
    { query: { enabled: !!businessId, queryKey: productsQK } },
  );

  const products: ProductSummary[] = (productsData as { data?: ProductSummary[] } | undefined)?.data ?? [];

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  function openAdd() {
    setEditingProduct(null);
    setForm(emptyForm());
    setSheetOpen(true);
  }

  function openEdit(p: ProductSummary) {
    setEditingProduct(p);
    setForm(productToForm(p));
    setSheetOpen(true);
  }

  function handleSave() {
    if (!businessId) return;

    const name = form.name.trim();
    if (!name) {
      toast.error('Product name is required');
      return;
    }

    const input: ProductInput = {
      name,
      description: form.description.trim() || undefined,
      price: form.price.trim() || undefined,
      unit: form.unit.trim() || undefined,
      stockStatus: form.stockStatus,
      status: form.status,
      sortOrder: form.sortOrder,
    };

    if (editingProduct) {
      updateProduct.mutate(
        { businessId, id: editingProduct.id, data: input, params: { marketplace: MARKETPLACE_SLUG } },
        {
          onSuccess: () => {
            toast.success('Product updated');
            queryClient.invalidateQueries({ queryKey: productsQK });
            setSheetOpen(false);
          },
          onError: (err) => {
            const e = err as { message?: string };
            toast.error(e.message ?? 'Failed to update product');
          },
        },
      );
    } else {
      createProduct.mutate(
        { businessId, data: input, params: { marketplace: MARKETPLACE_SLUG } },
        {
          onSuccess: () => {
            toast.success('Product added');
            queryClient.invalidateQueries({ queryKey: productsQK });
            setSheetOpen(false);
          },
          onError: (err) => {
            const e = err as { message?: string };
            toast.error(e.message ?? 'Failed to add product');
          },
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

  const isSaving = createProduct.isPending || updateProduct.isPending;

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

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
            <Package className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-medium">No products yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add products to showcase what you sell
            </p>
            <Button className="mt-4" onClick={openAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Add product
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {products.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-md border bg-card p-4"
              >
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
                <div className="ml-4 flex shrink-0 items-center gap-2">
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
            ))}
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
