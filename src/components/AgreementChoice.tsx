"use client";
import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
function Submit({ kind, ready }: { kind: string; ready: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={!ready || pending}>
      {pending
        ? "Saving…"
        : kind === "sow"
          ? "Accept this SOW"
          : kind === "terms"
            ? "Accept terms and continue"
            : "Acknowledge privacy and continue"}
    </button>
  );
}
export function AgreementChoice({
  kind,
  action,
  tenant,
  document,
}: {
  kind: string;
  action: (form: FormData) => Promise<void>;
  tenant: string;
  document: string;
}) {
  const marker = useRef<HTMLDivElement>(null);
  const [reached, setReached] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) setReached(true);
    });
    if (marker.current) observer.observe(marker.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={marker}>
      <form action={action} className="portal-card">
        <input type="hidden" name="tenant" value={tenant} />
        <input type="hidden" name="document" value={document} />
        <label className="portal-choice">
          <input type="checkbox" name="choice" value="yes" required />
          {kind === "sow"
            ? "I accept this custom services SOW on behalf of my business. This is separate from my hosting subscription."
            : kind === "terms"
              ? "I agree to these Terms of Service on behalf of my business."
              : "I acknowledge that this Privacy Policy has been made available to me."}
        </label>
        <p>
          Review the full document above before making your choice. This choice
          does not subscribe you to marketing.
        </p>
        <Submit kind={kind} ready={reached} />
      </form>
    </div>
  );
}
