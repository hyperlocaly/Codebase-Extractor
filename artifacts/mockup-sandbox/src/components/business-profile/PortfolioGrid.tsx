import { useState, useEffect, useCallback } from 'react';
import { Images, X, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import type { PortfolioCollection, PortfolioItem } from '@workspace/api-client-react';

interface PortfolioGridProps {
  portfolios: PortfolioCollection[];
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

function SkeletonGrid() {
  return (
    <div className="space-y-6">
      {[1, 2].map((i) => (
        <div key={i} className="space-y-3">
          <div className="h-5 w-40 animate-pulse rounded bg-muted" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 6 }).map((_, j) => (
              <div key={j} className="aspect-square animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ImageModal({
  items,
  startIndex,
  onClose,
}: {
  items: PortfolioItem[];
  startIndex: number;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState(startIndex);

  const prev = useCallback(() => setCurrent((i) => Math.max(0, i - 1)), []);
  const next = useCallback(() => setCurrent((i) => Math.min(items.length - 1, i + 1)), [items.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, prev, next]);

  const item = items[current];
  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] max-w-4xl w-full flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute -right-3 -top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-800 shadow-lg hover:bg-gray-100"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative flex items-center justify-center overflow-hidden rounded-xl bg-black">
          <img
            src={item.mediaUrl}
            alt={item.caption ?? 'Portfolio image'}
            className="max-h-[70vh] w-auto object-contain"
          />

          {items.length > 1 && (
            <>
              <button
                type="button"
                onClick={prev}
                disabled={current === 0}
                className="absolute left-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70 disabled:opacity-20"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={next}
                disabled={current === items.length - 1}
                className="absolute right-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70 disabled:opacity-20"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          <div className="absolute bottom-2 right-3 rounded bg-black/50 px-2 py-0.5 text-xs text-white">
            {current + 1} / {items.length}
          </div>
        </div>

        {(item.caption || item.description || item.externalUrl) && (
          <div className="mt-2 rounded-lg bg-white/10 px-4 py-3 text-white backdrop-blur-sm">
            {item.caption && (
              <p className="font-medium">{item.caption}</p>
            )}
            {item.description && (
              <p className="mt-1 text-sm text-white/80">{item.description}</p>
            )}
            {item.externalUrl && (
              <a
                href={item.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-sm text-blue-300 hover:text-blue-200"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View more
              </a>
            )}
          </div>
        )}

        {items.length > 1 && (
          <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
            {items.map((img, idx) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setCurrent(idx)}
                className={`shrink-0 h-14 w-14 overflow-hidden rounded border-2 transition ${
                  idx === current ? 'border-white' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img
                  src={img.thumbnailUrl ?? img.mediaUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FeaturedCollection({ collection }: { collection: PortfolioCollection }) {
  const [modalState, setModalState] = useState<{ items: PortfolioItem[]; index: number } | null>(null);
  const items = collection.items ?? [];
  const featured = items[0];

  if (!featured) return null;

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div
        className="group relative aspect-video cursor-pointer overflow-hidden"
        onClick={() => setModalState({ items, index: 0 })}
      >
        <img
          src={collection.featuredImage ?? featured.thumbnailUrl ?? featured.mediaUrl}
          alt={collection.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 p-4 text-white">
          <h3 className="text-lg font-semibold">{collection.title}</h3>
          {collection.description && (
            <p className="mt-0.5 text-sm text-white/80 line-clamp-2">{collection.description}</p>
          )}
          <p className="mt-1 text-xs text-white/60">
            {items.length} {items.length === 1 ? 'photo' : 'photos'}
          </p>
        </div>
      </div>

      {items.length > 1 && (
        <div className="grid grid-cols-4 gap-1 p-1">
          {items.slice(1, 5).map((item, idx) => (
            <div
              key={item.id}
              className="group relative aspect-square cursor-pointer overflow-hidden rounded"
              onClick={() => setModalState({ items, index: idx + 1 })}
            >
              <img
                src={item.thumbnailUrl ?? item.mediaUrl}
                alt={item.caption ?? ''}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                loading="lazy"
              />
              {idx === 3 && items.length > 5 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white font-semibold">
                  +{items.length - 5}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modalState && (
        <ImageModal
          items={modalState.items}
          startIndex={modalState.index}
          onClose={() => setModalState(null)}
        />
      )}
    </div>
  );
}

function CollectionBlock({ collection }: { collection: PortfolioCollection }) {
  const [modalState, setModalState] = useState<{ items: PortfolioItem[]; index: number } | null>(null);
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
            <div
              key={item.id ?? idx}
              className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg bg-muted"
              onClick={() => setModalState({ items, index: idx })}
            >
              <img
                src={item.thumbnailUrl ?? item.mediaUrl}
                alt={item.caption ?? 'Portfolio item'}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
              {item.caption && (
                <div className="absolute inset-x-0 bottom-0 translate-y-full bg-black/60 px-2 py-1 text-xs text-white transition-transform duration-200 group-hover:translate-y-0">
                  {item.caption}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed bg-muted/20">
          <p className="text-xs text-muted-foreground">No images in this collection</p>
        </div>
      )}

      {modalState && (
        <ImageModal
          items={modalState.items}
          startIndex={modalState.index}
          onClose={() => setModalState(null)}
        />
      )}
    </div>
  );
}

export function PortfolioGrid({ portfolios, isLoading, isError, onRetry }: PortfolioGridProps) {
  if (isLoading) {
    return <SkeletonGrid />;
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed py-12 text-center">
        <p className="text-sm font-medium text-destructive">Failed to load portfolio</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="text-sm text-muted-foreground underline hover:text-foreground"
          >
            Try Again
          </button>
        )}
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

  const [featured, ...rest] = portfolios;

  return (
    <div className="space-y-6">
      {featured && featured.items && featured.items.length > 0 && (
        <FeaturedCollection collection={featured} />
      )}
      {rest.map((col, idx) => (
        <CollectionBlock key={col.id ?? idx} collection={col} />
      ))}
    </div>
  );
}
