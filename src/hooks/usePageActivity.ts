'use client';

import { useEffect, useState } from 'react';

function getInitialVisibility() {
  if (typeof document === 'undefined') {
    return true;
  }

  return !document.hidden;
}

function getInitialOnlineStatus() {
  if (typeof navigator === 'undefined') {
    return true;
  }

  return navigator.onLine;
}

export function usePageActivity() {
  const [isVisible, setIsVisible] = useState(getInitialVisibility);
  const [isOnline, setIsOnline] = useState(getInitialOnlineStatus);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    const handleOnline = () => {
      setIsOnline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isVisible,
    isOnline,
    isActive: isVisible && isOnline,
  };
}
