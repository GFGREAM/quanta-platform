'use client';

import { useEffect, useState } from 'react';

// SSR-safe viewport hook. Returns `null` on the first render (server + pre-
// hydration), then the boolean once `matchMedia` is available. Consumers
// should render a skeleton while null so they don't render both trees at
// build time.
export function useIsMobile(maxWidthPx = 768): boolean | null {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${maxWidthPx - 1}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [maxWidthPx]);

  return isMobile;
}
