import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
  getListNotificationsQueryKey,
  getUnreadNotificationCountQueryKey,
} from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Bell,
  BellOff,
  Trash2,
  CheckCheck,
  AlertCircle,
  RefreshCw,
  Loader2,
  Circle,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface NotifRecord {
  id: string;
  type: string;
  title?: string | null;
  body?: string | null;
  channel?: string | null;
  status?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  actionUrl?: string | null;
  readAt?: string | null;
  createdAt: string;
}

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
}

function NotifCard({
  notif,
  onMarkRead,
  onDelete,
  isMarkingRead,
  isDeleting,
}: {
  notif: NotifRecord;
  onMarkRead: () => void;
  onDelete: () => void;
  isMarkingRead: boolean;
  isDeleting: boolean;
}) {
  const isUnread = !notif.readAt;

  return (
    <div
      className={cn(
        'group flex gap-3 rounded-xl border p-4 transition-colors',
        isUnread ? 'bg-primary/5 border-primary/20' : 'bg-card',
      )}
    >
      <div className="mt-0.5 shrink-0">
        {isUnread ? (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
            <Bell className="h-3.5 w-3.5 text-primary" />
          </div>
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
            <Circle className="h-3.5 w-3.5 text-muted-foreground/40" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          {isUnread && (
            <Badge variant="default" className="h-4 px-1.5 text-[10px]">
              New
            </Badge>
          )}
          {notif.type && (
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {notif.type.replace(/_/g, ' ')}
            </span>
          )}
          <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
            {timeAgo(notif.createdAt)}
          </span>
        </div>

        {notif.title && (
          <p className="text-sm font-medium leading-snug">{notif.title}</p>
        )}
        {notif.body && (
          <p className="text-sm text-muted-foreground">{notif.body}</p>
        )}

        {notif.actionUrl && (
          <a
            href={notif.actionUrl}
            target={notif.actionUrl.startsWith('http') ? '_blank' : undefined}
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            View details
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {isUnread && (
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Mark as read"
            onClick={onMarkRead}
            disabled={isMarkingRead}
          >
            {isMarkingRead ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCheck className="h-3.5 w-3.5" />
            )}
          </button>
        )}
        <button
          type="button"
          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          title="Delete notification"
          onClick={onDelete}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex gap-3 rounded-xl border bg-card p-4">
          <Skeleton className="h-7 w-7 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [pendingDelete, setPendingDelete] = useState<NotifRecord | null>(null);
  const [actionIds, setActionIds] = useState<Set<string>>(new Set());

  const listQK = getListNotificationsQueryKey(
    filter === 'unread' ? { unread: 'true' as const } : undefined,
  );
  const unreadQK = getUnreadNotificationCountQueryKey();

  const { data, isLoading, isError, refetch } = useListNotifications(
    filter === 'unread' ? { unread: 'true' as const } : undefined,
    {
      query: {
        queryKey: listQK,
        refetchInterval: 30_000,
      },
    },
  );

  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotif = useDeleteNotification();

  const notifs = ((data as any)?.data ?? []) as NotifRecord[];
  const pagination = (data as any)?.pagination as
    | { hasMore: boolean; nextCursor: string | null }
    | undefined;
  const unreadCount = notifs.filter((n) => !n.readAt).length;

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
    queryClient.invalidateQueries({ queryKey: unreadQK });
  }

  async function handleMarkRead(notif: NotifRecord) {
    setActionIds((s) => new Set(s).add(`read-${notif.id}`));
    try {
      await markRead.mutateAsync({ id: notif.id });
      invalidate();
    } catch {
      toast.error('Failed to mark as read.');
    } finally {
      setActionIds((s) => {
        const next = new Set(s);
        next.delete(`read-${notif.id}`);
        return next;
      });
    }
  }

  async function handleMarkAllRead() {
    try {
      await markAllRead.mutateAsync();
      invalidate();
      toast.success('All notifications marked as read.');
    } catch {
      toast.error('Failed to mark all as read.');
    }
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    const notif = pendingDelete;
    setPendingDelete(null);
    setActionIds((s) => new Set(s).add(`del-${notif.id}`));
    try {
      await deleteNotif.mutateAsync({ id: notif.id });
      invalidate();
    } catch {
      toast.error('Failed to delete notification.');
    } finally {
      setActionIds((s) => {
        const next = new Set(s);
        next.delete(`del-${notif.id}`);
        return next;
      });
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Notifications</h1>
            <p className="text-sm text-muted-foreground">
              Your recent activity and alerts.
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={markAllRead.isPending}
            className="shrink-0"
          >
            {markAllRead.isPending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
            )}
            Mark all read
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All
        </Button>
        <Button
          variant={filter === 'unread' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('unread')}
        >
          Unread
          {unreadCount > 0 && (
            <span className="ml-1.5 rounded-full bg-current/20 px-1.5 py-0 text-[10px] font-bold">
              {unreadCount}
            </span>
          )}
        </Button>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed py-14 text-center">
          <AlertCircle className="h-8 w-8 text-destructive/50" />
          <p className="text-sm text-muted-foreground">Failed to load notifications.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Try again
          </Button>
        </div>
      ) : notifs.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed bg-muted/10 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <BellOff className="h-7 w-7 text-muted-foreground/30" />
          </div>
          <div className="space-y-1">
            <p className="font-medium">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              {filter === 'unread'
                ? "You're all caught up!"
                : 'Notifications about your activity will appear here.'}
            </p>
          </div>
          {filter === 'unread' && (
            <Button variant="outline" size="sm" onClick={() => setFilter('all')}>
              View all notifications
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {notifs.map((notif) => (
              <NotifCard
                key={notif.id}
                notif={notif}
                onMarkRead={() => handleMarkRead(notif)}
                onDelete={() => setPendingDelete(notif)}
                isMarkingRead={actionIds.has(`read-${notif.id}`)}
                isDeleting={actionIds.has(`del-${notif.id}`)}
              />
            ))}
          </div>

          {pagination?.hasMore && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Load more
              </Button>
            </div>
          )}
        </>
      )}

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete notification?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.title
                ? `"${pendingDelete.title}" will be permanently deleted.`
                : 'This notification will be permanently deleted.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
