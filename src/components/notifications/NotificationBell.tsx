'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUnreadCount, useNotifications, useMarkAsRead } from '@/hooks/useNotifications';
import NotificationItem from './NotificationItem';

interface NotificationBellProps {
  enabled?: boolean;
}

export default function NotificationBell({ enabled = true }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const { data: unreadCount = 0, refetch: refetchUnreadCount } = useUnreadCount(enabled);
  const {
    data: notifications = [],
    isLoading,
    refetch: refetchNotifications,
  } = useNotifications(enabled && open);
  const markAsRead = useMarkAsRead();

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (nextOpen) {
      void refetchUnreadCount();
      void refetchNotifications();
    }
  };

  const handleMarkAllRead = () => {
    void markAsRead.mutate({ all: true }).then(() => {
      void refetchUnreadCount();
      void refetchNotifications();
    });
  };

  const handleMarkOneRead = (id: string) => {
    void markAsRead.mutate({ ids: [id] }).then(() => {
      void refetchUnreadCount();
      void refetchNotifications();
    });
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full text-slate-500 hover:text-teal-600 hover:bg-teal-50"
          aria-label="Notificaciones"
        >
          <span className="material-symbols-rounded">notifications</span>
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0" sideOffset={8}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800">Notificaciones</h3>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-teal-600 hover:text-teal-700 font-medium"
            >
              Marcar todo como leído
            </button>
          )}
        </div>

        <ScrollArea className="max-h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <span className="material-symbols-rounded animate-spin text-slate-400">progress_activity</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
              <span className="material-symbols-rounded text-3xl mb-2">notifications_off</span>
              <p className="text-sm">No tienes notificaciones</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onRead={handleMarkOneRead}
                  onClose={() => setOpen(false)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
