'use client';

import { useRouter } from 'next/navigation';
import {
  Bell,
  CalendarCheck,
  CalendarDays,
  CircleAlert,
  ClipboardCheck,
  Eye,
  Flag,
  HandHeart,
  Handshake,
  Heart,
  HeartHandshake,
  Home,
  House,
  MessageCircle,
  MessagesSquare,
  MessageSquare,
  PawPrint,
  Stethoscope,
  Store,
  ThumbsUp,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';
import type { Notification } from '@/hooks/useNotifications';
import { timeAgo } from '@/lib/utils';

const ICON_MAP: Record<string, LucideIcon> = {
  MATCH: Heart,
  MESSAGE: MessageCircle,
  GROUP_MESSAGE: MessagesSquare,
  COMMENT: MessageSquare,
  LIKE: ThumbsUp,
  APPOINTMENT: CalendarDays,
  EVENT_ATTEND: CalendarCheck,
  PROVIDER_REQUEST: Store,
  GROUP_JOIN: UserPlus,
  LOST_PET_ALERT: CircleAlert,
  SIGHTING: Eye,
  ADOPTION_APPLICATION: HandHeart,
  ADOPTION_MATCH: PawPrint,
  FOSTER_OFFER: Home,
  FOSTER_RESPONSE: HandHeart,
  FOSTER_PLACEMENT: Handshake,
  FOSTER_CASE_ALERT: HeartHandshake,
  FOSTER_ADOPTION: House,
  VOLUNTEER_OFFER: HandHeart,
  VOLUNTEER_RESPONSE: Handshake,
  VOLUNTEER_ASSIGNMENT: ClipboardCheck,
  SOLIDARITY_ADOPTION_ALERT: PawPrint,
  SOLIDARITY_VETERINARY_ALERT: Stethoscope,
  CONTENT_REPORT: Flag,
};

const COLOR_MAP: Record<string, string> = {
  MATCH: 'text-pink-500',
  MESSAGE: 'text-blue-500',
  GROUP_MESSAGE: 'text-indigo-500',
  COMMENT: 'text-teal-500',
  LIKE: 'text-orange-500',
  APPOINTMENT: 'text-green-500',
  EVENT_ATTEND: 'text-teal-600',
  PROVIDER_REQUEST: 'text-amber-600',
  GROUP_JOIN: 'text-cyan-500',
  LOST_PET_ALERT: 'text-red-500',
  SIGHTING: 'text-amber-600',
  ADOPTION_APPLICATION: 'text-teal-600',
  ADOPTION_MATCH: 'text-pink-500',
  FOSTER_OFFER: 'text-orange-600',
  FOSTER_RESPONSE: 'text-teal-600',
  FOSTER_PLACEMENT: 'text-emerald-600',
  FOSTER_CASE_ALERT: 'text-orange-600',
  FOSTER_ADOPTION: 'text-pink-600',
  VOLUNTEER_OFFER: 'text-teal-600',
  VOLUNTEER_RESPONSE: 'text-orange-600',
  VOLUNTEER_ASSIGNMENT: 'text-emerald-600',
  SOLIDARITY_ADOPTION_ALERT: 'text-pink-600',
  SOLIDARITY_VETERINARY_ALERT: 'text-red-600',
  CONTENT_REPORT: 'text-rose-600',
};

interface NotificationItemProps {
  notification: Notification;
  onRead: (id: string) => void;
  onClose: () => void;
}

export default function NotificationItem({ notification, onRead, onClose }: NotificationItemProps) {
  const router = useRouter();
  const Icon = ICON_MAP[notification.type] || Bell;
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
      <Icon className={`size-6 mt-0.5 shrink-0 ${color}`} aria-hidden="true" />
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
