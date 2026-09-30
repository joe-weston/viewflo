"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authReady, supabase } from "../../lib/portal";
import { safeSlug } from "../../lib/portal-policy";
import { requestPortal } from "../../lib/portal-request";
import { loginPath } from "../../lib/portal-urls";
export async function authenticate(form: FormData) {
  const tenant = String(form.get("tenant") ?? "");
  if (!safeSlug(tenant)) redirect("/auth?error=unavailable");
  const location = await requestPortal(tenant);
  const login = loginPath(location);
  if (!authReady()) redirect(`${login}&error=unavailable`);
  const email = String(form.get("email") ?? "").trim();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    redirect(`${login}&error=email`);
  const jar = await cookies();
  if (jar.get("vf_magic_link_cooldown"))
    redirect(`${login}&message=check-email`);
  const db = await supabase();
  const callback = new URL("/auth/callback/", location.origin);
  callback.searchParams.set("tenant", tenant);
  const { error } = await db.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: callback.toString() },
  });
  jar.set("vf_magic_link_cooldown", String(Date.now() + 60_000), {
    httpOnly: true,
    secure: location.origin.startsWith("https:"),
    sameSite: "lax",
    path: "/auth",
    maxAge: 60,
  });
  // Identical confirmation for unregistered addresses; Supabase enforces authoritative rate limits.
  if (error && error.status && error.status >= 500)
    redirect(`${login}&error=unavailable`);
  redirect(`${login}&message=check-email`);
}
export async function signout(form: FormData) {
  const tenant = String(form.get("tenant") ?? "");
  if (!safeSlug(tenant)) redirect("/auth");
  const location = await requestPortal(tenant);
  if (authReady()) {
    const db = await supabase();
    await db.auth.signOut();
  }
  redirect(loginPath(location));
}
