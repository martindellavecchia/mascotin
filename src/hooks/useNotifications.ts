'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePageActivity } from '@/hooks/usePageActivity';

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

interface QueryState<T> {
  data: T;
  isLoading: boolean;
  refetch: () => Promise<T>;
}

export function useUnreadCount(enabled: boolean) {
  const { isActive } = usePageActivity();
  const [data, setData] = useState(0);
  const [isLoading, setIsLoading] = useState(enabled);
  const dataRef = useRef(data);
  const wasActiveRef = useRef(isActive);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const refetch = useCallback(async () => {
    if (!enabled) return dataRef.current;

    setIsLoading(true);
    try {
      const res = await fetch('/api/notifications/unread-count');
      if (!res.ok) {
        return dataRef.current;
      }

      const payload = await res.json();
      const count = (payload.count as number) || 0;
      setData(count);
      return count;
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setData(0);
      setIsLoading(false);
      return;
    }

    void refetch();
  }, [enabled, refetch]);

  useEffect(() => {
    if (!enabled || !isActive) {
      return;
    }

    const interval = setInterval(() => {
      void refetch();
    }, 60_000);

    return () => clearInterval(interval);
  }, [enabled, isActive, refetch]);

  useEffect(() => {
    if (enabled && isActive && !wasActiveRef.current) {
      void refetch();
    }

    wasActiveRef.current = isActive;
  }, [enabled, isActive, refetch]);

  return {
    data,
    isLoading,
    refetch,
  } satisfies QueryState<number>;
}

export function useNotifications(enabled: boolean) {
  const { isActive } = usePageActivity();
  const [data, setData] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dataRef = useRef(data);
  const wasActiveRef = useRef(isActive);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const refetch = useCallback(async () => {
    if (!enabled) return dataRef.current;

    setIsLoading(true);
    try {
      const res = await fetch('/api/notifications?limit=20');
      if (!res.ok) throw new Error('Failed to fetch notifications');
      const payload = await res.json();
      const notifications = payload.notifications as Notification[];
      setData(notifications);
      return notifications;
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) {
      void refetch();
    }
  }, [enabled, refetch]);

  useEffect(() => {
    if (enabled && isActive && !wasActiveRef.current) {
      void refetch();
    }

    wasActiveRef.current = isActive;
  }, [enabled, isActive, refetch]);

  return {
    data,
    isLoading,
    refetch,
  } satisfies QueryState<Notification[]>;
}

export function useMarkAsRead() {
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback(async (params: { ids?: string[]; all?: boolean }) => {
    setIsPending(true);
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error('Failed to mark as read');
      return res.json();
    } finally {
      setIsPending(false);
    }
  }, []);

  return {
    mutate,
    isPending,
  };
}
