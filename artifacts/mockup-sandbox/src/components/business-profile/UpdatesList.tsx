import { Megaphone, Newspaper, Tag, CalendarDays, Rss } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export interface BusinessUpdate {
  id: string;
  businessId: string;
  title: string;
  body: string;
  updateType: 'news' | 'offer' | 'event' | 'announcement';
  status: string;
  publishedAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

const UPDATE_TYPE_MAP: Record<
  BusinessUpdate['updateType'],
  { label: string; icon: React.ReactNode; className: string }
> = {
  news: {
    label: 'News',
    icon: <Newspaper className="h-3.5 w-3.5" />,
    className:
      'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300',
  },
  offer: {
    label: 'Offer',
    icon: <Tag className="h-3.5 w-3.5" />,
    className:
      'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300',
  },
  event: {
    label: 'Event',
    icon: <CalendarDays className="h-3.5 w-3.5" />,
    className:
      'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300',
  },
  announcement: {
    label: 'Announcement',
    icon: <Megaphone className="h-3.5 w-3.5" />,
    className:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300',
  },
};

function timeAgo(date: string | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  const now = Date.now();
  const diff = now - d.getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30)
    return `${Math.floor(days / 7)} week${Math.floor(days / 7) !== 1 ? 's' : ''} ago`;
  if (days < 365)
    return `${Math.floor(days / 30)} month${Math.floor(days / 30) !== 1 ? 's' : ''} ago`;
  return `${Math.floor(days / 365)} year${Math.floor(days / 365) !== 1 ? 's' : ''} ago`;
}

function isExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}

function UpdateCard({ update }: { update: BusinessUpdate }) {
  const meta =
    UPDATE_TYPE_MAP[update.updateType] ?? UPDATE_TYPE_MAP.announcement;
  const expired = isExpired(update.expiresAt);
  const date = update.publishedAt ?? update.createdAt;

  return (
    <article
      className={`rounded-xl border bg-card p-4 transition-shadow hover:shadow-sm ${expired ? 'opacity-60' : ''}`}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.className}`}
        >
          {meta.icon}
          {meta.label}
        </span>
        <div className="flex items-center gap-2">
          {expired && (
            <Badge variant="outline" className="text-[10px]">
              Expired
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">{timeAgo(date)}</span>
        </div>
      </div>

      <h4 className="mb-1 font-medium leading-snug">{update.title}</h4>
      <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
        {update.body}
      </p>

      {update.expiresAt && !expired && (
        <p className="mt-2 text-xs text-muted-foreground">
          Expires {timeAgo(update.expiresAt)}
        </p>
      )}
    </article>
  );
}

interface UpdatesListProps {
  updates: BusinessUpdate[];
  isLoading: boolean;
}

export function UpdatesList({ updates, isLoading }: UpdatesListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4 space-y-2">
            <div className="flex justify-between">
              <div className="h-5 w-24 animate-pulse rounded-full bg-muted" />
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-3 w-full animate-pulse rounded bg-muted" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (updates.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed bg-muted/20 py-12 text-center">
        <Rss className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm font-medium text-muted-foreground">
          No updates posted yet.
        </p>
        <p className="text-xs text-muted-foreground/70">
          Business news, offers, and announcements will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {updates.map((u) => (
        <UpdateCard key={u.id} update={u} />
      ))}
    </div>
  );
}
