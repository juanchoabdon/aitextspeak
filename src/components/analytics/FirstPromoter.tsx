'use client';

import Script from 'next/script';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fpr?: any;
  }
}

export function FirstPromoterScripts() {
  const cid = process.env.NEXT_PUBLIC_FIRSTPROMOTER_CID || 'dsfm605n';

  return (
    <>
      <Script
        id="firstpromoter-init"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `(function(w){w.fpr=w.fpr||function(){w.fpr.q=w.fpr.q||[];w.fpr.q[arguments[0]=='set'?'unshift':'push'](arguments);};})(window);
fpr("init",{cid:"${cid}"}); 
fpr("click");`,
        }}
      />
      <Script
        id="firstpromoter-script"
        strategy="beforeInteractive"
        src="https://cdn.firstpromoter.com/fpr.js"
      />
    </>
  );
}


