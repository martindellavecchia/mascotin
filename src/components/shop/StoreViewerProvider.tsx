'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { StoreInteractionProps, StoreViewerState } from '@/lib/server/stores';

interface StoreViewerContextValue {
  store: StoreInteractionProps;
  viewer: StoreViewerState;
  setViewer: React.Dispatch<React.SetStateAction<StoreViewerState>>;
  refreshViewer: () => Promise<void>;
  requireAuth: () => void;
  callbackPath: string;
  loginHref: string;
}

const StoreViewerContext = createContext<StoreViewerContextValue | null>(null);

const anonymousViewer: StoreViewerState = {
  isAuthenticated: false,
  isOwner: false,
  reviewEligibility: 'unauthenticated',
  ownReviewId: null,
  ownReview: null,
  helpfulReviewIds: [],
};

function buildLoginHref(path: string) {
  return `/login?callbackUrl=${encodeURIComponent(path)}`;
}

export function StoreViewerProvider({
  store,
  children,
}: {
  store: StoreInteractionProps;
  children: ReactNode;
}) {
  const callbackPath = `/shop/${store.slug}`;
  const loginHref = buildLoginHref(callbackPath);
  const [viewer, setViewer] = useState<StoreViewerState>(anonymousViewer);

  const refreshViewer = useCallback(async () => {
    const response = await fetch(`/api/stores/${store.slug}/viewer`);
    const data = await response.json();
    if (!data.success) return;
    setViewer(data.data as StoreViewerState);
  }, [store.slug]);

  useEffect(() => {
    void refreshViewer();
  }, [refreshViewer]);

  const requireAuth = useCallback(() => {
    window.location.href = loginHref;
  }, [loginHref]);

  const value = useMemo(
    () => ({
      store,
      viewer,
      setViewer,
      refreshViewer,
      requireAuth,
      callbackPath,
      loginHref,
    }),
    [store, viewer, refreshViewer, requireAuth, callbackPath, loginHref]
  );

  return <StoreViewerContext.Provider value={value}>{children}</StoreViewerContext.Provider>;
}

export function useStoreViewer() {
  const context = useContext(StoreViewerContext);
  if (!context) {
    throw new Error('useStoreViewer must be used within StoreViewerProvider');
  }
  return context;
}
