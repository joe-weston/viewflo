"use server";
import { redirect } from "next/navigation";
import { authReady, supabase } from "../../lib/portal";
import { safeSlug } from "../../lib/portal-policy";
import { appOrigin } from "../../lib/billing";
export async function authenticate(form: FormData) {
  const tenant = String(form.get("tenant") ?? "");
  if (!safeSlug(tenant) || !authReady()) redirect("/auth?error=unavailable");
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (email.length > 254 || password.length < 8 || password.length > 128)
    redirect(`/auth?tenant=${tenant}&error=credentials`);
  const db = await supabase();
  if (form.get("mode") === "signup") {
    // No slug-to-membership write. Account creation cannot claim an existing business.
    const { error } = await db.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${appOrigin()}/auth/callback` },
    });
    if (error) redirect(`/auth?tenant=${tenant}&error=credentials`);
    redirect(`/auth?tenant=${tenant}&message=check-email`);
  }
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) redirect(`/auth?tenant=${tenant}&error=credentials`);
  redirect(`/${tenant}/admin`);
}
export async function signout() {
  if (authReady()) {
    const db = await supabase();
    await db.auth.signOut();
  }
  redirect("/auth");
}
