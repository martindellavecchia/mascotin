'use client';

import type { ReactNode } from 'react';
import { useVisibilityActivation } from '@/hooks/useVisibilityActivation';

interface DeferredVisibilitySectionProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export default function DeferredVisibilitySection({
  children,
  fallback = null,
}: DeferredVisibilitySectionProps) {
  const { elementRef, isVisible } = useVisibilityActivation();

  return <div ref={elementRef}>{isVisible ? children : fallback}</div>;
}
