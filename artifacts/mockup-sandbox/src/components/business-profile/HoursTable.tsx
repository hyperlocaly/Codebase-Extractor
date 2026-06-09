import type { GetBusinessHours200 } from '@workspace/api-client-react';
import { Clock } from 'lucide-react';

type BusinessHour = NonNullable<GetBusinessHours200['data']>[number];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatTime(t: string | null | undefined): string {
  if (!t) return '';
  const [hStr, mStr] = t.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function HourRow({ hour, isToday }: { hour: BusinessHour; isToday: boolean }) {
  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-lg px-3 py-2 text-sm ${
        isToday ? 'bg-primary/8 font-medium' : 'hover:bg-muted/50'
      }`}
    >
      <div className="flex w-28 items-center gap-2">
        {isToday && (
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
        )}
        <span className={isToday ? 'text-primary' : 'text-muted-foreground'}>
          {DAY_NAMES[hour.dayOfWeek]}
        </span>
      </div>
      {hour.isClosed ? (
        <span className="text-destructive/70">Closed</span>
      ) : hour.opensAt && hour.closesAt ? (
        <span className={isToday ? 'text-foreground' : 'text-foreground/80'}>
          {formatTime(hour.opensAt)} – {formatTime(hour.closesAt)}
        </span>
      ) : (
        <span className="italic text-muted-foreground/60">Hours not set</span>
      )}
    </div>
  );
}

function EmptyHours() {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <Clock className="h-8 w-8 text-muted-foreground/30" />
      <p className="text-sm text-muted-foreground">Opening hours not set yet.</p>
    </div>
  );
}

interface HoursTableProps {
  hours: BusinessHour[];
  isLoading: boolean;
}

export function HoursTable({ hours, isLoading }: HoursTableProps) {
  const todayIndex = new Date().getDay();

  if (isLoading) {
    return (
      <div className="space-y-1.5">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex justify-between rounded-lg px-3 py-2">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (hours.length === 0) return <EmptyHours />;

  const sortedHours = [...hours].sort((a, b) => {
    const aMon = (a.dayOfWeek + 6) % 7;
    const bMon = (b.dayOfWeek + 6) % 7;
    return aMon - bMon;
  });

  return (
    <div className="divide-y divide-transparent space-y-0.5">
      {sortedHours.map((hour) => (
        <HourRow
          key={hour.id}
          hour={hour}
          isToday={hour.dayOfWeek === todayIndex}
        />
      ))}
    </div>
  );
}
