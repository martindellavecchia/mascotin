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

const URGENT_TYPES = new Set(['LOST_PET_ALERT', 'SOLIDARITY_VETERINARY_ALERT', 'CONTENT_REPORT']);

interface NotificationItemProps {
  notification: Notification;
  onRead: (id: string) => void;
  onClose: () => void;
}

export default function NotificationItem({ notification, onRead, onClose }: NotificationItemProps) {
  const router = useRouter();
  const Icon = ICON_MAP[notification.type] || Bell;
  const urgent = URGENT_TYPES.has(notification.type);

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
      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-primary-soft/50 ${
        !notification.read ? 'bg-primary-soft/40' : ''
      }`}
    >
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${urgent ? 'bg-destructive/10 text-destructive' : 'bg-primary-soft text-primary'}`}>
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${!notification.read ? 'font-semibold text-foreground' : 'text-slate-700'}`}>
          {notification.title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{notification.body}</p>
        <p className="text-xs text-muted-foreground mt-1">{timeAgo(notification.createdAt)}</p>
      </div>
      {!notification.read && (
        <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
      )}
    </button>
  );
}
