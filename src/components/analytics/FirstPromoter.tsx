'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fpr?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    __aitextspeak_fpr_loaded__?: any;
  }
}

export function FirstPromoterScripts() {
  const cid = process.env.NEXT_PUBLIC_FIRSTPROMOTER_CID || 'dsfm605n';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.__aitextspeak_fpr_loaded__) return;
    window.__aitextspeak_fpr_loaded__ = true;

    // Initialize queueing function
    (function (w: Window) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (w as any).fpr =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (w as any).fpr ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        function (...args: any[]) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const f: any = (w as any).fpr;
          f.q = f.q || [];
          f.q[args[0] === 'set' ? 'unshift' : 'push'](args);
        };
    })(window);

    // Init + click tracking
    try {
      window.fpr?.('init', { cid });
      window.fpr?.('click');
    } catch {
      // no-op
    }

    // Load FirstPromoter script
    const existing = document.getElementById('firstpromoter-script');
    if (existing) return;

    const script = document.createElement('script');
    script.id = 'firstpromoter-script';
    script.async = true;
    script.src = 'https://cdn.firstpromoter.com/fpr.js';
    document.head.appendChild(script);
  }, [cid]);

  return null;
}


