import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import {
  useUnreadNotificationCount,
  getUnreadNotificationCountQueryKey,
} from '@workspace/api-client-react';
import type { UnreadNotificationCount200 } from '@workspace/api-client-react';

interface NotificationBellProps {
  isAuthenticated: boolean;
}

export function NotificationBell({ isAuthenticated }: NotificationBellProps) {
  const qk = getUnreadNotificationCountQueryKey();

  const { data } = useUnreadNotificationCount({
    query: {
      enabled: isAuthenticated,
      queryKey: qk,
      refetchInterval: 60_000,
    },
  });

  const count =
    (data as (UnreadNotificationCount200 & { data?: { count?: number } }) | undefined)?.data
      ?.count ?? 0;

  if (!isAuthenticated) return null;

  return (
    <Link
      to="/notifications"
      className="relative flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      aria-label={count > 0 ? `${count} unread notification${count !== 1 ? 's' : ''}` : 'Notifications'}
    >
      <Bell className="h-4 w-4" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-destructive px-0.5 text-[10px] font-bold leading-none text-destructive-foreground">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
