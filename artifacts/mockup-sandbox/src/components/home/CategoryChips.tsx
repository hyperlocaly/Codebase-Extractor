import { Link } from 'react-router-dom';
import { useListCategories } from '@workspace/api-client-react';
import type { CategorySummary } from '@workspace/api-client-react';
import { AlertCircle, Tag } from 'lucide-react';

const CATEGORY_ICONS: Record<string, string> = {
  tailor: '🧵',
  'fashion-designer': '✂️',
  'fabric-seller': '🪡',
  'embroidery-service': '🌸',
  'pattern-maker': '📐',
  'accessory-supplier': '💎',
  'fashion-trainer': '📚',
};

function ChipSkeleton() {
  return (
    <div className="h-9 w-28 shrink-0 animate-pulse rounded-full bg-muted" />
  );
}

interface CategoryChipProps {
  category: CategorySummary;
}

function CategoryChip({ category }: CategoryChipProps) {
  const icon = CATEGORY_ICONS[category.slug] ?? '🏪';
  return (
    <Link
      to={`/category/${category.slug}`}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-primary hover:text-primary-foreground hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="text-base leading-none">{icon}</span>
      {category.name}
    </Link>
  );
}

interface CategoryChipsProps {
  parentSlug?: string;
}

export function CategoryChips({ parentSlug = 'fashion-tailoring' }: CategoryChipsProps) {
  const { data, isLoading, isError, refetch } = useListCategories({
    parent: parentSlug,
  });

  const categories = data?.data ?? [];

  if (isError) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>Failed to load categories.</span>
        <button
          onClick={() => refetch()}
          className="ml-auto underline underline-offset-2 hover:no-underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {isLoading ? (
          Array.from({ length: 7 }).map((_, i) => <ChipSkeleton key={i} />)
        ) : categories.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Tag className="h-4 w-4" />
            No categories found.
          </div>
        ) : (
          categories.map((cat) => <CategoryChip key={cat.id} category={cat} />)
        )}
      </div>
      <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-background to-transparent" />
    </div>
  );
}
