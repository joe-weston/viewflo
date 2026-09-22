'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: { sitekey: string; action: string; callback: (token: string) => void; 'expired-callback': () => void }) => string;
      reset: (id: string) => void;
      remove: (id: string) => void;
    };
  }
}

export function ContactForm({ siteKey }: { siteKey: string }) {
  const verificationRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [token, setToken] = useState('');
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;
    const render = () => {
      if (cancelled || !window.turnstile || !verificationRef.current) return;
      try {
        widgetId.current = window.turnstile.render(verificationRef.current, {
          sitekey: siteKey,
          action: 'contact',
          callback: setToken,
          'expired-callback': () => setToken(''),
        });
      } catch {
        setError('The security check is unavailable. Please call 818-618-5288.');
      }
    };
    if (window.turnstile) render();
    else {
      const existing = document.querySelector<HTMLScriptElement>('script[data-viewflo-turnstile]');
      const script = existing || document.createElement('script');
      script.addEventListener('load', render, { once: true });
      script.addEventListener('error', () => setError('The security check is unavailable. Please call 818-618-5288.'), { once: true });
      if (!existing) {
        script.dataset.viewfloTurnstile = 'true';
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        document.head.appendChild(script);
      }
    }
    return () => {
      cancelled = true;
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [siteKey]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !token) return;
    const fields = new FormData(event.currentTarget);
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/contact/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fields.get('name'),
          email: fields.get('email'),
          phone: fields.get('phone'),
          message: fields.get('message'),
          website: fields.get('website'),
          consent: fields.get('consent') === 'yes',
          verification: token,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Your message could not be sent.');
      if (widgetId.current) {
        window.turnstile?.remove(widgetId.current);
        widgetId.current = null;
      }
      setDone(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Your message could not be sent.');
      setToken('');
      if (widgetId.current) window.turnstile?.reset(widgetId.current);
    } finally {
      setPending(false);
    }
  }

  if (done) return <div className="viewflo-contact" role="status"><h2>Thank you for reaching out</h2><p>Your message has been saved. Pasadena Shades &amp; Shutters will follow up using the contact details you provided.</p></div>;
  if (!siteKey) return <div className="viewflo-contact"><h2>Contact us</h2><p>The online form is temporarily unavailable. Please call <a href="tel:+18186185288">818-618-5288</a>.</p></div>;

  return (
    <form className="viewflo-contact" onSubmit={submit}>
      <h2>Request a free consultation</h2>
      <p>Tell us about your windows and how to reach you. An appointment is confirmed when we speak with you.</p>
      <div className="viewflo-contact-grid">
        <label>Full name <input name="name" autoComplete="name" minLength={2} maxLength={120} required /></label>
        <label>Email <input name="email" type="email" autoComplete="email" maxLength={254} required /></label>
        <label>Phone <input name="phone" type="tel" autoComplete="tel" maxLength={30} /></label>
      </div>
      <label>How can we help? <textarea name="message" rows={5} minLength={5} maxLength={2000} required /></label>
      <div className="viewflo-contact-trap" aria-hidden="true"><label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <label className="viewflo-contact-consent"><input name="consent" type="checkbox" value="yes" required /> Pasadena Shades &amp; Shutters may contact me about this request.</label>
      <div ref={verificationRef} className="viewflo-contact-verification" />
      {error && <p className="viewflo-contact-error" role="alert">{error}</p>}
      <button type="submit" disabled={pending || !token}>{pending ? 'Sending…' : 'Send request'}</button>
    </form>
  );
}
