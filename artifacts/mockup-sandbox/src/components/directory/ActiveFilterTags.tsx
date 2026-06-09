import { X } from 'lucide-react';

interface ActiveFilter {
  key: string;
  label: string;
  onRemove: () => void;
}

interface ActiveFilterTagsProps {
  filters: ActiveFilter[];
}

export function ActiveFilterTags({ filters }: ActiveFilterTagsProps) {
  if (filters.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((f) => (
        <span
          key={f.key}
          className="inline-flex items-center gap-1 rounded-full border bg-muted/60 px-3 py-1 text-xs font-medium text-foreground"
        >
          {f.label}
          <button
            onClick={f.onRemove}
            className="ml-0.5 rounded-full p-0.5 hover:bg-destructive/10 hover:text-destructive transition-colors"
            aria-label={`Remove ${f.label} filter`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
    </div>
  );
}
