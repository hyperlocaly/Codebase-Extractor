import type { ListServices200 } from '@workspace/api-client-react';
import { Clock, Scissors } from 'lucide-react';

type Service = NonNullable<ListServices200['data']>[number];

function formatDuration(minutes: number | null | undefined): string {
  if (!minutes) return '';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatPriceRange(from: string | null | undefined, to: string | null | undefined): string {
  if (from && to) return `₦${from} – ₦${to}`;
  if (from) return `From ₦${from}`;
  if (to) return `Up to ₦${to}`;
  return '';
}

function ServiceCard({ service }: { service: Service }) {
  const price = formatPriceRange(service.priceFrom, service.priceTo);
  const duration = formatDuration(service.durationMinutes);

  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-card p-4 transition-shadow hover:shadow-sm">
      <h4 className="font-medium leading-snug">{service.name}</h4>
      {service.description && (
        <p className="line-clamp-2 text-sm text-muted-foreground">{service.description}</p>
      )}
      <div className="mt-auto flex flex-wrap items-center gap-3 pt-1">
        {price && (
          <span className="text-base font-semibold text-primary">{price}</span>
        )}
        {duration && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {duration}
          </span>
        )}
        {service.availability && (
          <span className="text-xs text-muted-foreground">{service.availability}</span>
        )}
      </div>
    </div>
  );
}

interface ServiceListProps {
  services: Service[];
  isLoading: boolean;
}

export function ServiceList({ services, isLoading }: ServiceListProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-xl border bg-card p-4">
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-3 w-full animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
            <div className="h-5 w-28 animate-pulse rounded bg-muted pt-1" />
          </div>
        ))}
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed bg-muted/20 py-12 text-center">
        <Scissors className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm font-medium text-muted-foreground">No services listed yet.</p>
        <p className="text-xs text-muted-foreground/70">
          Services will appear here once added by the business.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {services.map((s) => (
        <ServiceCard key={s.id} service={s} />
      ))}
    </div>
  );
}
