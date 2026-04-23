'use client';

import { useCallback, useEffect, useRef } from 'react';
import { usePageActivity } from '@/hooks/usePageActivity';

interface UseAdaptivePollingOptions {
  enabled: boolean;
  onPoll: () => Promise<void>;
  activeIntervalMs?: number;
  idleIntervalMs?: number;
  recentActivityWindowMs?: number;
  immediate?: boolean;
}

export function useAdaptivePolling({
  enabled,
  onPoll,
  activeIntervalMs = 5_000,
  idleIntervalMs = 15_000,
  recentActivityWindowMs = 30_000,
  immediate = true,
}: UseAdaptivePollingOptions) {
  const { isActive } = usePageActivity();
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityAtRef = useRef(Date.now());
  const onPollRef = useRef(onPoll);

  useEffect(() => {
    onPollRef.current = onPoll;
  }, [onPoll]);

  const clearScheduledPoll = useCallback(() => {
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  }, []);

  const scheduleNextPoll = useCallback(() => {
    clearScheduledPoll();

    if (!enabled || !isActive) {
      return;
    }

    const now = Date.now();
    const isRecentlyActive =
      now - lastActivityAtRef.current <= recentActivityWindowMs;
    const nextInterval = isRecentlyActive ? activeIntervalMs : idleIntervalMs;

    pollTimeoutRef.current = setTimeout(async () => {
      await onPollRef.current();
      scheduleNextPoll();
    }, nextInterval);
  }, [
    activeIntervalMs,
    clearScheduledPoll,
    enabled,
    idleIntervalMs,
    isActive,
    recentActivityWindowMs,
  ]);

  const markActivity = useCallback(() => {
    lastActivityAtRef.current = Date.now();
    scheduleNextPoll();
  }, [scheduleNextPoll]);

  const refreshNow = useCallback(async () => {
    if (!enabled || !isActive) {
      return;
    }

    await onPollRef.current();
    scheduleNextPoll();
  }, [enabled, isActive, scheduleNextPoll]);

  useEffect(() => {
    if (!enabled || !isActive) {
      clearScheduledPoll();
      return;
    }

    if (immediate) {
      void refreshNow();
    } else {
      scheduleNextPoll();
    }

    return clearScheduledPoll;
  }, [
    clearScheduledPoll,
    enabled,
    immediate,
    isActive,
    refreshNow,
    scheduleNextPoll,
  ]);

  useEffect(() => clearScheduledPoll, [clearScheduledPoll]);

  return {
    isPolling: enabled && isActive,
    markActivity,
    refreshNow,
    clearScheduledPoll,
  };
}
