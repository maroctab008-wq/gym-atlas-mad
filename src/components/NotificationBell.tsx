import { Bell, CheckCheck, AlertTriangle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNotifications, SubscriptionNotification } from '@/hooks/useNotifications';
import { useNavigate } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';

export function NotificationBell() {
  const { notifications, unreadCount, markAllAsRead, markAsRead, isRead } = useNotifications();
  const navigate = useNavigate();

  const handleClick = (notif: typeof notifications[0]) => {
    markAsRead(notif.id);
    navigate(`/subscriptions`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground animate-pulse">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 bg-popover z-50">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span className="text-sm font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                markAllAsRead();
              }}
            >
              <CheckCheck className="w-3 h-3 mr-1" />
              Tout marquer lu
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Aucune notification
          </div>
        ) : (
          <ScrollArea className="max-h-72">
            {notifications.map((notif) => (
              <DropdownMenuItem
                key={notif.id}
                className="flex items-start gap-3 p-3 cursor-pointer focus:bg-accent"
                onClick={() => handleClick(notif)}
              >
                <div className="mt-0.5">
                  {notif.daysOverdue === 0 ? (
                    <Clock className="w-4 h-4 text-warning" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{notif.memberName}</p>
                  <p className="text-xs text-muted-foreground">
                    {notif.plan} — {notif.daysOverdue === 0
                      ? "Expire aujourd'hui"
                      : `${notif.daysOverdue} jour${notif.daysOverdue > 1 ? 's' : ''} de retard`}
                  </p>
                </div>
                {!isRead(notif.id) && (
                  <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                )}
              </DropdownMenuItem>
            ))}
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
