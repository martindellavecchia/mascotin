'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { sanitizeCallbackUrl } from '@/lib/callback-url';

export default function ReturnLink({
  href,
  children,
  className,
}: {
  href: '/login' | '/register';
  children: React.ReactNode;
  className?: string;
}) {
  const [destination, setDestination] = useState<string>(href);
  useEffect(() => {
    const callback = new URLSearchParams(window.location.search).get('callbackUrl');
    setDestination(
      callback ? `${href}?callbackUrl=${encodeURIComponent(sanitizeCallbackUrl(callback))}` : href
    );
  }, [href]);
  return (
    <Link href={destination} className={className}>
      {children}
    </Link>
  );
}
