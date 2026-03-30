'use client';

import { useRouter } from 'next/navigation';
import { timeAgo } from '@/lib/utils';
import type { Notification } from '@/hooks/useNotifications';

const ICON_MAP: Record<string, string> = {
  MATCH: 'favorite',
  MESSAGE: 'chat',
  GROUP_MESSAGE: 'forum',
  COMMENT: 'comment',
  LIKE: 'thumb_up',
  APPOINTMENT: 'calendar_month',
  EVENT_ATTEND: 'event_available',
  PROVIDER_REQUEST: 'storefront',
  GROUP_JOIN: 'group_add',
};

const COLOR_MAP: Record<string, string> = {
  MATCH: 'text-pink-500',
  MESSAGE: 'text-blue-500',
  GROUP_MESSAGE: 'text-indigo-500',
  COMMENT: 'text-teal-500',
  LIKE: 'text-orange-500',
  APPOINTMENT: 'text-green-500',
  EVENT_ATTEND: 'text-purple-500',
  PROVIDER_REQUEST: 'text-amber-600',
  GROUP_JOIN: 'text-cyan-500',
};

interface NotificationItemProps {
  notification: Notification;
  onRead: (id: string) => void;
  onClose: () => void;
}

export default function NotificationItem({ notification, onRead, onClose }: NotificationItemProps) {
  const router = useRouter();
  const icon = ICON_MAP[notification.type] || 'notifications';
  const color = COLOR_MAP[notification.type] || 'text-slate-500';

  const handleClick = () => {
    if (!notification.read) {
      onRead(notification.id);
    }
    if (notification.link) {
      onClose();
      router.push(notification.link);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
        !notification.read ? 'bg-teal-50/50' : ''
      }`}
    >
      <span className={`material-symbols-rounded text-xl mt-0.5 shrink-0 ${color}`}>
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${!notification.read ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
          {notification.title}
        </p>
        <p className="text-xs text-slate-500 mt-0.5 truncate">{notification.body}</p>
        <p className="text-xs text-slate-400 mt-1">{timeAgo(notification.createdAt)}</p>
      </div>
      {!notification.read && (
        <span className="w-2 h-2 bg-teal-500 rounded-full mt-2 shrink-0" />
      )}
    </button>
  );
}
