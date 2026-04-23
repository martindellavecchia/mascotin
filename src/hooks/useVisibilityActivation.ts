'use client';

import { useEffect, useRef, useState } from 'react';

interface UseVisibilityActivationOptions {
  rootMargin?: string;
  once?: boolean;
}

export function useVisibilityActivation({
  rootMargin = '200px',
  once = true,
}: UseVisibilityActivationOptions = {}) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = elementRef.current;

    if (!node || isVisible) {
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true);

          if (once) {
            observer.disconnect();
          }
        }
      },
      { rootMargin }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [isVisible, once, rootMargin]);

  return {
    elementRef,
    isVisible,
  };
}
