import type { ListProducts200 } from '@workspace/api-client-react';
import { Badge } from '@/components/ui/badge';
import { Package } from 'lucide-react';

type Product = NonNullable<ListProducts200['data']>[number];

const STOCK_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  in_stock: { label: 'In Stock', variant: 'default' },
  out_of_stock: { label: 'Out of Stock', variant: 'destructive' },
  made_to_order: { label: 'Made to Order', variant: 'secondary' },
};

function ProductCard({ product }: { product: Product }) {
  const stock = STOCK_MAP[product.stockStatus] ?? { label: product.stockStatus, variant: 'outline' as const };

  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-card p-4 transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-medium leading-snug">{product.name}</h4>
        <Badge variant={stock.variant} className="shrink-0 text-[10px]">
          {stock.label}
        </Badge>
      </div>
      {product.description && (
        <p className="line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
      )}
      {product.price && (
        <div className="mt-auto flex items-baseline gap-1 pt-1">
          <span className="text-base font-semibold text-primary">₦{product.price}</span>
          {product.unit && (
            <span className="text-xs text-muted-foreground">/ {product.unit}</span>
          )}
        </div>
      )}
    </div>
  );
}

interface ProductListProps {
  products: Product[];
  isLoading: boolean;
}

export function ProductList({ products, isLoading }: ProductListProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-xl border bg-card p-4">
            <div className="flex justify-between">
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-3 w-full animate-pulse rounded bg-muted" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-5 w-24 animate-pulse rounded bg-muted pt-1" />
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed bg-muted/20 py-12 text-center">
        <Package className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm font-medium text-muted-foreground">No products listed yet.</p>
        <p className="text-xs text-muted-foreground/70">
          Products will appear here once added by the business.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
