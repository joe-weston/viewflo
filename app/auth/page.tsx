import Link from "next/link";
import { cookies, headers } from "next/headers";
import { authenticate } from "./actions";
import { authReady } from "../../lib/portal";
import { safeSlug } from "../../lib/portal-policy";
import { tenantForHost, PASADENA_TENANT } from "../../lib/tenant-routing";
import { requestPortal } from "../../lib/portal-request";
import { tenantPath } from "../../lib/portal-urls";
import { MagicLinkForm } from "../../src/components/MagicLinkForm";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Manager sign-in | Viewflo",
  robots: { index: false, follow: false },
};
export default async function Auth({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const query = await searchParams;
  const hostTenant = tenantForHost((await headers()).get("host"));
  const tenant =
    hostTenant ??
    (safeSlug(query.tenant ?? "") ? query.tenant! : PASADENA_TENANT);
  let location;
  try {
    location = await requestPortal(tenant);
  } catch {
    location = null;
  }
  const ready = authReady() && !!location;
  const cooldown = Number(
    (await cookies()).get("vf_magic_link_cooldown")?.value ?? 0,
  );
  return (
    <div className="portal-shell portal-login">
      <Link href={location ? tenantPath(location) : "/"}>
        {tenant === PASADENA_TENANT ? "Pasadena Shades & Shutters" : "Viewflo"}
      </Link>
      <p className="eyebrow">PRIVATE BUSINESS WORKSPACE</p>
      <h1>Welcome back.</h1>
      <p>
        Sign in with a secure email link to review your agreements and manage
        billing.
      </p>
      {!ready && (
        <p role="status" className="portal-notice">
          Account access is awaiting configuration. Please return once your
          workspace is ready.
        </p>
      )}
      {query.error && (
        <p role="alert" className="portal-notice">
          {query.error === "access"
            ? "This account doesn’t have billing access to this site. Contact your administrator."
            : query.error === "expired"
              ? "This sign-in link has expired or has already been used. Request a new link below."
              : query.error === "email"
                ? "Enter a valid email address."
                : "We couldn’t send a sign-in link. Please try again later."}
        </p>
      )}
      {query.message === "check-email" && (
        <p role="status" className="portal-notice">
          Check your email. If this address is authorized, you’ll receive a
          sign-in link to return to this site’s Billing page.
        </p>
      )}
      <MagicLinkForm
        tenant={tenant}
        ready={ready}
        cooldownUntil={Number.isFinite(cooldown) ? cooldown : 0}
        action={authenticate}
      />
    </div>
  );
}
