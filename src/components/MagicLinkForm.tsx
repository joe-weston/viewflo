"use client";
import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
function Submit({
  ready,
  cooldownUntil,
}: {
  ready: boolean;
  cooldownUntil: number;
}) {
  const { pending } = useFormStatus();
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const tick = () =>
      setSeconds(Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [cooldownUntil]);
  return (
    <button disabled={!ready || pending || seconds > 0}>
      {pending
        ? "Sending…"
        : seconds > 0
          ? `Send again in ${seconds}s`
          : "Send sign-in link"}
    </button>
  );
}
export function MagicLinkForm({
  tenant,
  ready,
  cooldownUntil,
  action,
}: {
  tenant: string;
  ready: boolean;
  cooldownUntil: number;
  action: (form: FormData) => Promise<void>;
}) {
  return (
    <form action={action} className="portal-card magic-link-card">
      <input type="hidden" name="tenant" value={tenant} />
      <label htmlFor="manager-email">
        Manager email
        <input
          id="manager-email"
          type="email"
          name="email"
          autoComplete="email"
          required
          maxLength={254}
          placeholder="you@yourbusiness.com"
        />
      </label>
      <Submit ready={ready} cooldownUntil={cooldownUntil} />
      <p className="portal-muted">
        Use the email your administrator assigned to this site. A sign-in link
        doesn’t accept agreements or start a subscription.
      </p>
    </form>
  );
}
