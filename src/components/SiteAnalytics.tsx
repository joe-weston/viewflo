"use client";
import { Analytics } from "@vercel/analytics/next";
import { track } from "@vercel/analytics";
import { useEffect } from "react";
export function event(
  name:
    | "photo_request_started"
    | "photo_request_submitted"
    | "photo_request_error"
    | "phone_click"
    | "consultation_click",
) {
  track(name);
}
export function SiteAnalytics() {
  useEffect(() => {
    const click = (e: MouseEvent) => {
      const a = (e.target as Element)?.closest("a");
      if (a?.getAttribute("href")?.startsWith("tel:")) event("phone_click");
      if (a?.getAttribute("href") === "/consultation")
        event("consultation_click");
    };
    document.addEventListener("click", click);
    return () => document.removeEventListener("click", click);
  }, []);
  return (
    <Analytics
      beforeSend={(e) => {
        const url = new URL(e.url);
        url.search = "";
        url.hash = "";
        return { ...e, url: url.toString() };
      }}
    />
  );
}

