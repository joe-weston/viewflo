'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    WufooForm?: new () => {
      initialize: (options: Record<string, string | boolean>) => void;
      display: () => void;
    };
    __pasadenaWufooLoaded?: Promise<void>;
    __pasadenaWufooMounted?: Record<string, boolean>;
  }
}

const forms = [
  { id: 'q9zvpb00j0kxm1', height: '593' },
  { id: 'qh61a851fzs4gd', height: '855' },
  { id: 'qo4vetx1v30z7d', height: '645' },
];

function loadWufoo() {
  if (window.__pasadenaWufooLoaded) return window.__pasadenaWufooLoaded;

  window.__pasadenaWufooLoaded = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src*="secure.wufoo.com/scripts/embed/form.js"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      if (window.WufooForm) resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://secure.wufoo.com/scripts/embed/form.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Unable to load Wufoo embed script'));
    document.body.appendChild(script);
  });

  return window.__pasadenaWufooLoaded;
}

export function LegacyWufooEmbeds() {
  useEffect(() => {
    let cancelled = false;

    loadWufoo()
      .then(() => {
        if (cancelled || !window.WufooForm) return;
        window.__pasadenaWufooMounted ||= {};

        for (const form of forms) {
          const mount = document.getElementById(`wufoo-${form.id}`);
          if (!mount || window.__pasadenaWufooMounted[form.id]) continue;
          window.__pasadenaWufooMounted[form.id] = true;

          const wufoo = new window.WufooForm();
          wufoo.initialize({
            userName: 'footbridgesupport',
            formHash: form.id,
            autoResize: true,
            height: form.height,
            async: true,
            host: 'wufoo.com',
            header: 'show',
            ssl: true,
          });
          wufoo.display();
        }
      })
      .catch(() => {
        // Keep the legacy fallback link visible when Wufoo is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
