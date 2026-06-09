import { useState } from 'react';
import { useListCategories, useListLocations } from '@workspace/api-client-react';
import type { CategorySummary, LocationSummary } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { SlidersHorizontal, X } from 'lucide-react';

const CATEGORY_ICONS: Record<string, string> = {
  tailor: '🧵',
  'fashion-designer': '✂️',
  'fabric-seller': '🪡',
  'embroidery-service': '🌸',
  'pattern-maker': '📐',
  'accessory-supplier': '💎',
  'fashion-trainer': '📚',
};

interface FilterSidebarProps {
  categorySlug?: string;
  locationSlug?: string;
  onCategoryChange: (slug?: string) => void;
  onLocationChange: (slug?: string) => void;
}

function CategorySelector({
  categorySlug,
  onCategoryChange,
}: Pick<FilterSidebarProps, 'categorySlug' | 'onCategoryChange'>) {
  const { data, isLoading } = useListCategories({ parent: 'fashion-tailoring' });
  const categories: CategorySummary[] = data?.data ?? [];

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Category
      </p>
      {isLoading ? (
        <div className="space-y-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <button
            onClick={() => onCategoryChange(undefined)}
            className={`rounded-md px-3 py-1.5 text-left text-sm transition-colors hover:bg-muted ${
              !categorySlug ? 'bg-primary/10 font-medium text-primary' : 'text-foreground'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() =>
                onCategoryChange(categorySlug === cat.slug ? undefined : cat.slug)
              }
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm transition-colors hover:bg-muted ${
                categorySlug === cat.slug
                  ? 'bg-primary/10 font-medium text-primary'
                  : 'text-foreground'
              }`}
            >
              <span>{CATEGORY_ICONS[cat.slug] ?? '🏪'}</span>
              {cat.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LocationSelector({
  locationSlug,
  onLocationChange,
}: Pick<FilterSidebarProps, 'locationSlug' | 'onLocationChange'>) {
  const [selectedStateSlug, setSelectedStateSlug] = useState<string | undefined>(
    locationSlug,
  );

  const { data: statesData, isLoading: statesLoading } = useListLocations({
    country: 'NG',
  });
  const states: LocationSummary[] = statesData?.data?.locations ?? [];

  const { data: lgaData, isLoading: lgaLoading } = useListLocations(
    { country: 'NG', parent: selectedStateSlug ?? '' },
    {
      query: {
        enabled: !!selectedStateSlug,
        queryKey: ['locations', 'NG', selectedStateSlug],
      },
    },
  );
  const lgas: LocationSummary[] = lgaData?.data?.locations ?? [];

  const handleStateChange = (val: string) => {
    const slug = val === '__all__' ? undefined : val;
    setSelectedStateSlug(slug);
    onLocationChange(slug);
  };

  const handleLgaChange = (val: string) => {
    const slug = val === '__all__' ? selectedStateSlug : val;
    onLocationChange(slug);
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Location
      </p>

      <Select
        value={selectedStateSlug ?? '__all__'}
        onValueChange={handleStateChange}
        disabled={statesLoading}
      >
        <SelectTrigger className="h-8 text-sm">
          <SelectValue placeholder="Select state…" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All States</SelectItem>
          {states.map((s) => (
            <SelectItem key={s.id} value={s.slug}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedStateSlug && (
        <Select
          value={locationSlug === selectedStateSlug ? '__state__' : (locationSlug ?? '__state__')}
          onValueChange={handleLgaChange}
          disabled={lgaLoading}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder={lgaLoading ? 'Loading…' : 'All LGAs'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__state__">All LGAs</SelectItem>
            {lgas.map((lga) => (
              <SelectItem key={lga.id} value={lga.slug}>
                {lga.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

function FilterContent({
  categorySlug,
  locationSlug,
  onCategoryChange,
  onLocationChange,
}: FilterSidebarProps) {
  const hasFilters = !!categorySlug || !!locationSlug;

  return (
    <div className="flex flex-col gap-5">
      <CategorySelector
        categorySlug={categorySlug}
        onCategoryChange={onCategoryChange}
      />
      <Separator />
      <LocationSelector
        locationSlug={locationSlug}
        onLocationChange={onLocationChange}
      />
      {hasFilters && (
        <>
          <Separator />
          <Button
            variant="ghost"
            size="sm"
            className="justify-start gap-2 text-muted-foreground hover:text-destructive"
            onClick={() => {
              onCategoryChange(undefined);
              onLocationChange(undefined);
            }}
          >
            <X className="h-3.5 w-3.5" />
            Clear all filters
          </Button>
        </>
      )}
    </div>
  );
}

export function FilterSidebar(props: FilterSidebarProps) {
  return (
    <>
      <aside className="hidden w-56 shrink-0 lg:block">
        <div className="sticky top-20 rounded-xl border bg-card p-4">
          <h2 className="mb-4 text-sm font-semibold">Filters</h2>
          <FilterContent {...props} />
        </div>
      </aside>

      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {(props.categorySlug || props.locationSlug) && (
                <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                  {[props.categorySlug, props.locationSlug].filter(Boolean).length}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 pt-10">
            <SheetHeader className="mb-5 text-left">
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <FilterContent {...props} />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
