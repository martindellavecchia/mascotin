'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff, LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUnreadCount, useNotifications, useMarkAsRead } from '@/hooks/useNotifications';
import NotificationItem from './NotificationItem';

interface NotificationBellProps {
  enabled?: boolean;
}

const DESKTOP_SIDEBAR_POPOVER_OFFSET = 200;

export default function NotificationBell({ enabled = true }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [hasDesktopSidebar, setHasDesktopSidebar] = useState(false);
  const { data: unreadCount = 0, refetch: refetchUnreadCount } = useUnreadCount(enabled);
  const {
    data: notifications = [],
    isLoading,
    isError: notificationsError,
    refetch: refetchNotifications,
  } = useNotifications(enabled && open);
  const markAsRead = useMarkAsRead();

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const syncViewport = () => setHasDesktopSidebar(mediaQuery.matches);
    syncViewport();
    mediaQuery.addEventListener('change', syncViewport);
    return () => mediaQuery.removeEventListener('change', syncViewport);
  }, []);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (nextOpen) {
      void refetchUnreadCount();
      void refetchNotifications();
    }
  };

  const markRead = async (params: { ids?: string[]; all?: boolean }, errorMessage: string) => {
    try {
      await markAsRead.mutate(params);
    } catch (error) {
      console.error('Marking notifications as read failed:', error);
      toast.error(errorMessage);
      return;
    }
    void refetchUnreadCount();
    void refetchNotifications();
  };

  const handleMarkAllRead = () => {
    void markRead({ all: true }, 'No pudimos marcar las notificaciones como leídas. Reintentá.');
  };

  const handleMarkOneRead = (id: string) => {
    void markRead({ ids: [id] }, 'No pudimos marcar la notificación como leída.');
  };

  const triggerLabel = unreadCount > 0
    ? `Notificaciones, ${unreadCount} sin leer`
    : 'Notificaciones';

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-xl text-slate-500 hover:text-teal-600 hover:bg-teal-50"
          aria-label={triggerLabel}
        >
          <Bell className="size-5" aria-hidden="true" />
          {unreadCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1"
              aria-hidden="true"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side={hasDesktopSidebar ? 'right' : 'bottom'}
        collisionPadding={16}
        className="w-[min(360px,calc(100vw-2rem))] border-border shadow-xl p-0"
        sideOffset={hasDesktopSidebar ? DESKTOP_SIDEBAR_POPOVER_OFFSET : 12}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800">Notificaciones</h3>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={markAsRead.isPending}
              className="inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium disabled:cursor-not-allowed disabled:opacity-60"
            >
              {markAsRead.isPending && <LoaderCircle className="size-3 animate-spin" aria-hidden="true" />}
              Marcar todo como leído
            </button>
          )}
        </div>

        <ScrollArea className="max-h-[400px]">
          {isLoading && notifications.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <LoaderCircle className="size-5 animate-spin text-slate-400" aria-hidden="true" />
            </div>
          ) : notificationsError && notifications.length === 0 ? (
            <div role="alert" className="flex flex-col items-center justify-center gap-3 px-4 py-8 text-center">
              <p className="text-sm text-destructive">No pudimos cargar tus notificaciones.</p>
              <Button type="button" size="sm" variant="outline" onClick={() => void refetchNotifications()}>
                Reintentar
              </Button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-600">
              <BellOff className="mb-2 size-8" aria-hidden="true" />
              <p className="text-sm">Todavía no tenés notificaciones</p>
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
