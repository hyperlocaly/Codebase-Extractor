import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearchSuggestions } from '@workspace/api-client-react';
import type { SearchSuggestions200 } from '@workspace/api-client-react';
import { Search, X, Building2, Tag, MapPin, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { MARKETPLACE_SLUG } from '@/lib/constants';
import { useDebounce } from '@/hooks/useDebounce';

interface SuggestionItem {
  id: string;
  label: string;
  sub?: string;
  href: string;
}

function SuggestionGroup({
  title,
  icon,
  items,
  onSelect,
}: {
  title: string;
  icon: React.ReactNode;
  items: SuggestionItem[];
  onSelect: (href: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-1.5 px-3 py-1.5">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
      </div>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(item.href);
          }}
          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/70"
        >
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-medium">{item.label}</span>
            {item.sub && (
              <span className="truncate text-xs text-muted-foreground">{item.sub}</span>
            )}
          </span>
          <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
        </button>
      ))}
    </div>
  );
}

export interface SearchBarProps {
  defaultValue?: string;
  onSearch?: (q: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  size?: 'default' | 'lg';
}

export function SearchBar({
  defaultValue = '',
  onSearch,
  placeholder = 'Search businesses, categories, locations…',
  className,
  autoFocus = false,
  size = 'default',
}: SearchBarProps) {
  const navigate = useNavigate();
  const [value, setValue] = useState(defaultValue);
  const [focused, setFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const prevDefaultRef = useRef(defaultValue);
  useEffect(() => {
    if (prevDefaultRef.current !== defaultValue) {
      prevDefaultRef.current = defaultValue;
      setValue(defaultValue);
    }
  }, [defaultValue]);

  const debouncedQ = useDebounce(value.trim(), 300);
  const showDropdown = focused && debouncedQ.length >= 2;

  const { data: rawData, isLoading: loadingSuggestions } = useSearchSuggestions(
    { q: debouncedQ, marketplace: MARKETPLACE_SLUG },
    {
      query: {
        enabled: showDropdown,
        staleTime: 15_000,
        queryKey: ['search', 'suggestions', debouncedQ, MARKETPLACE_SLUG],
      },
    },
  );

  const envelope = rawData as { data?: SearchSuggestions200 } | undefined;
  const suggestions = envelope?.data;
  const bizSuggestions = suggestions?.businesses ?? [];
  const catSuggestions = suggestions?.categories ?? [];
  const locSuggestions = suggestions?.locations ?? [];
  const hasSuggestions =
    bizSuggestions.length > 0 || catSuggestions.length > 0 || locSuggestions.length > 0;

  const isDropdownOpen = showDropdown && (loadingSuggestions || hasSuggestions);

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const q = value.trim();
    setFocused(false);
    if (!q) return;
    if (onSearch) {
      onSearch(q);
    } else {
      navigate(`/search?q=${encodeURIComponent(q)}`);
    }
  }

  function handleSelect(href: string) {
    setFocused(false);
    if (href.startsWith('/search')) {
      navigate(href);
    } else {
      navigate(href);
    }
  }

  function handleClear() {
    setValue('');
    inputRef.current?.focus();
    if (onSearch) onSearch('');
  }

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <Search
          className={cn(
            'absolute left-3 pointer-events-none text-muted-foreground',
            size === 'lg' ? 'h-5 w-5' : 'h-4 w-4',
          )}
        />
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setFocused(false);
          }}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={cn(
            'pr-9',
            size === 'lg' ? 'h-12 pl-10 text-base' : 'pl-9',
          )}
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Clear search"
          >
            <X className={size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'} />
          </button>
        )}
      </form>

      {isDropdownOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border bg-popover shadow-lg">
          {loadingSuggestions && !hasSuggestions ? (
            <div className="space-y-1.5 p-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-7 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : (
            <div className="py-1">
              <SuggestionGroup
                title="Businesses"
                icon={<Building2 className="h-3 w-3" />}
                items={bizSuggestions
                  .filter((b) => b.id && b.name && b.slug)
                  .map((b) => ({
                    id: b.id!,
                    label: b.name!,
                    href: `/business/${b.slug}`,
                  }))}
                onSelect={handleSelect}
              />
              <SuggestionGroup
                title="Categories"
                icon={<Tag className="h-3 w-3" />}
                items={catSuggestions
                  .filter((c) => c.id && c.name && c.slug)
                  .map((c) => ({
                    id: c.id!,
                    label: c.name!,
                    href: `/search?category=${c.slug}`,
                  }))}
                onSelect={handleSelect}
              />
              <SuggestionGroup
                title="Locations"
                icon={<MapPin className="h-3 w-3" />}
                items={locSuggestions
                  .filter((l) => l.id && (l.name || l.fullName))
                  .map((l) => ({
                    id: l.id!,
                    label: l.fullName ?? l.name ?? '',
                    href: `/search?q=${encodeURIComponent(l.fullName ?? l.name ?? '')}`,
                  }))}
                onSelect={handleSelect}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
