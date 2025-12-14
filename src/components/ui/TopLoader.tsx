'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function TopLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Reset on route change complete
    setLoading(false);
    setProgress(100);
    
    const timeout = setTimeout(() => {
      setProgress(0);
    }, 300);

    return () => clearTimeout(timeout);
  }, [pathname, searchParams]);

  useEffect(() => {
    let progressInterval: NodeJS.Timeout;

    if (loading) {
      setProgress(10);
      progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);
    }

    return () => {
      if (progressInterval) clearInterval(progressInterval);
    };
  }, [loading]);

  // Listen for navigation start
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      
      if (anchor && anchor.href && !anchor.target && !anchor.download) {
        const url = new URL(anchor.href);
        const currentUrl = new URL(window.location.href);
        
        // Only trigger for internal navigation
        if (url.origin === currentUrl.origin && url.pathname !== currentUrl.pathname) {
          setLoading(true);
        }
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  if (progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-1">
      <div
        className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-300 ease-out shadow-lg shadow-orange-500/50"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
        }}
      />
    </div>
  );
}









