import Link from "next/link";
import { authenticate } from "./actions";
import { authReady } from "../../lib/portal";
import { safeSlug } from "../../lib/portal-policy";
export const dynamic = "force-dynamic";
export default async function Auth({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const query = await searchParams;
  const tenant = safeSlug(query.tenant ?? "")
    ? query.tenant!
    : "pasadena-shades-and-shutters";
  const ready = authReady();
  return (
    <div className="portal-shell">
      <Link href="/">ViewFlow</Link>
      <p className="eyebrow">YOUR BUSINESS WORKSPACE</p>
      <h1>Welcome back.</h1>
      <p>Sign in to review your agreements and manage your subscription.</p>
      {!ready && (
        <p role="status" className="portal-notice">
          Account access is awaiting configuration. Please return once your
          workspace is ready.
        </p>
      )}
      {query.error && (
        <p role="alert">
          We couldn’t sign you in. Check your details or try again later.
        </p>
      )}
      {query.message && (
        <p role="status">
          If account confirmation is needed, check your email, then return here
          to sign in. A workspace administrator must authorize your access.
        </p>
      )}
      <form action={authenticate} className="portal-card">
        <input type="hidden" name="tenant" value={tenant} />
        <label>
          Email
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            maxLength={254}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            minLength={8}
            maxLength={128}
          />
        </label>
        <button name="mode" value="signin" disabled={!ready}>
          Sign in
        </button>
        <button
          name="mode"
          value="signup"
          className="secondary"
          disabled={!ready}
        >
          Create an account
        </button>
        <p>
          Creating an account does not accept the service agreements or start a
          subscription. Access to an existing business requires authorization.
        </p>
      </form>
    </div>
  );
}
