'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ContactForm } from './contact-form';

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

const otherForms = [
  { id: 'q9zvpb00j0kxm1', height: '593' },
  { id: 'qo4vetx1v30z7d', height: '645' },
];

function loadWufoo() {
  if (window.__pasadenaWufooLoaded) return window.__pasadenaWufooLoaded;
  window.__pasadenaWufooLoaded = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://secure.wufoo.com/scripts/embed/form.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Unable to load Wufoo embed script'));
    document.body.appendChild(script);
  });
  return window.__pasadenaWufooLoaded;
}

export function LegacyWufooEmbeds({ contactSiteKey }: { contactSiteKey: string }) {
  const [contactMount, setContactMount] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const mount = document.getElementById('wufoo-qh61a851fzs4gd');
    if (mount) {
      mount.replaceChildren();
      setContactMount(mount);
    }
    if (!otherForms.some((form) => document.getElementById(`wufoo-${form.id}`))) return;
    let cancelled = false;
    loadWufoo().then(() => {
      if (cancelled || !window.WufooForm) return;
      window.__pasadenaWufooMounted ||= {};
      for (const form of otherForms) {
        if (!document.getElementById(`wufoo-${form.id}`) || window.__pasadenaWufooMounted[form.id]) continue;
        window.__pasadenaWufooMounted[form.id] = true;
        const wufoo = new window.WufooForm();
        wufoo.initialize({ userName: 'footbridgesupport', formHash: form.id, autoResize: true, height: form.height, async: true, host: 'wufoo.com', header: 'show', ssl: true });
        wufoo.display();
      }
    }).catch(() => { /* Legacy links remain available. */ });
    return () => { cancelled = true; };
  }, []);

  return contactMount ? createPortal(<ContactForm siteKey={contactSiteKey} />, contactMount) : null;
}
