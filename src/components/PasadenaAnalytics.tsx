"use client";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
export const measurementId = "G-XHKPP6CVFR";
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    pasadenaGaReady?: boolean;
    pasadenaLastPage?: string;
  }
}
export function publicAnalyticsPath(path: string) {
  const clean =
    path.replace(/^\/pasadena-shades-and-shutters/, "").replace(/\/$/, "") ||
    "/";
  return /^\/(?:admin|auth|account|api)(?:\/|$)/.test(clean) ? null : clean;
}
export function trackPasadena(
  name: "phone_click" | "consultation_submitted" | "photo_submitted",
) {
  if (window.pasadenaGaReady && publicAnalyticsPath(window.location.pathname))
    window.gtag?.("event", name);
}
export function PasadenaAnalytics({ enabled }: { enabled: boolean }) {
  const pathname = usePathname();
  useEffect(() => {
    if (!enabled) return;
    const path = publicAnalyticsPath(pathname);
    if (!path) return;
    window.dataLayer ||= [];
    window.gtag ||= (...args) => window.dataLayer!.push(args);
    if (!window.pasadenaGaReady) {
      window.gtag("js", new Date());
      window.gtag("config", measurementId, {
        send_page_view: false,
        page_referrer: "",
        allow_google_signals: false,
      });
      window.pasadenaGaReady = true;
    }
    window.gtag("set", {
      page_location: "https://www.pasadenashadesandshutters.com" + path,
      page_referrer: "",
    });
    if (window.pasadenaLastPage !== path)
      window.gtag("event", "page_view", {
        page_location: "https://www.pasadenashadesandshutters.com" + path,
        page_title: "Pasadena Shades & Shutters",
      });
    window.pasadenaLastPage = path;
    const click = (event: MouseEvent) => {
      if (
        event.target instanceof Element &&
        event.target.closest('a[href^="tel:"]')
      )
        trackPasadena("phone_click");
    };
    document.addEventListener("click", click);
    return () => {
      document.removeEventListener("click", click);
    };
  }, [pathname, enabled]);
  if (!enabled) return null;
  return (
    <Script
      src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
      strategy="afterInteractive"
    />
  );
}
