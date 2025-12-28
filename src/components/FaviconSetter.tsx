'use client';

import { useEffect } from 'react';

export function FaviconSetter() {
  useEffect(() => {
    // Remove any existing favicons
    const existingLinks = document.querySelectorAll("link[rel*='icon']");
    existingLinks.forEach(link => link.remove());

    // Add our favicon
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    link.href = '/favicon.svg';
    document.head.appendChild(link);

    // Also add shortcut icon for older browsers
    const shortcutLink = document.createElement('link');
    shortcutLink.rel = 'shortcut icon';
    shortcutLink.href = '/favicon.svg';
    document.head.appendChild(shortcutLink);
  }, []);

  return null;
}

