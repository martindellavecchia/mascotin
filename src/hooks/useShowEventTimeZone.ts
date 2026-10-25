'use client';

import { useEffect, useState } from 'react';
import { isArgentineTimeZone } from '@/lib/timezone-label';

/** Event times are always in Argentina; the zone note only shows when the browser is elsewhere. */
export function useShowEventTimeZone() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(!isArgentineTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone));
  }, []);
  return show;
}
