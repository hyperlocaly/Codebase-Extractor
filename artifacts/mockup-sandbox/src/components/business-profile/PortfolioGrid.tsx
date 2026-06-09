import { Images } from 'lucide-react';

interface PortfolioItem {
  id?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  caption?: string;
  sortOrder?: number;
}

interface PortfolioCollection {
  id?: string;
  title?: string;
  description?: string;
  status?: string;
  items?: PortfolioItem[];
}

interface PortfolioGridProps {
  portfolios: Record<string, unknown>[];
  isLoading: boolean;
}

function PortfolioItemTile({ item }: { item: PortfolioItem }) {
  const src = item.thumbnailUrl ?? item.mediaUrl;
  return (
    <div className="group relative aspect-square overflow-hidden rounded-lg bg-muted">
      {src ? (
        <img
          src={src}
          alt={item.caption ?? 'Portfolio item'}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Images className="h-8 w-8 text-muted-foreground/30" />
        </div>
      )}
      {item.caption && (
        <div className="absolute inset-x-0 bottom-0 translate-y-full bg-black/60 px-2 py-1 text-xs text-white transition-transform duration-200 group-hover:translate-y-0">
          {item.caption}
        </div>
      )}
    </div>
  );
}

function CollectionBlock({ collection }: { collection: PortfolioCollection }) {
  const items = collection.items ?? [];
  return (
    <div className="space-y-3">
      {collection.title && (
        <div>
          <h4 className="font-medium">{collection.title}</h4>
          {collection.description && (
            <p className="mt-0.5 text-sm text-muted-foreground">{collection.description}</p>
          )}
        </div>
      )}
      {items.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item, idx) => (
            <PortfolioItemTile key={item.id ?? idx} item={item} />
          ))}
        </div>
      ) : (
        <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed bg-muted/20">
          <p className="text-xs text-muted-foreground">No images in this collection</p>
        </div>
      )}
    </div>
  );
}

export function PortfolioGrid({ portfolios, isLoading }: PortfolioGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-square animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (portfolios.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed bg-muted/20 py-12 text-center">
        <Images className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm font-medium text-muted-foreground">No portfolio added yet.</p>
        <p className="text-xs text-muted-foreground/70">
          Work samples will appear here once uploaded by the business.
        </p>
      </div>
    );
  }

  const collections = portfolios as unknown as PortfolioCollection[];

  return (
    <div className="space-y-6">
      {collections.map((col, idx) => (
        <CollectionBlock key={col.id ?? idx} collection={col} />
      ))}
    </div>
  );
}
