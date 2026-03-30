'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface NotificationActor {
  id: string;
  name: string | null;
  image: string | null;
}

export interface Notification {
  id: string;
  userId: string;
  actorId: string | null;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  entityId: string | null;
  createdAt: string;
  actor: NotificationActor | null;
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const res = await fetch('/api/notifications/unread-count');
      if (!res.ok) return 0;
      const data = await res.json();
      return (data.count as number) || 0;
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

export function useNotifications(enabled: boolean) {
  return useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: async () => {
      const res = await fetch('/api/notifications?limit=20');
      if (!res.ok) throw new Error('Failed to fetch notifications');
      const data = await res.json();
      return data.notifications as Notification[];
    },
    enabled,
    staleTime: 10_000,
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { ids?: string[]; all?: boolean }) => {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error('Failed to mark as read');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
