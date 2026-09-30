import { NextResponse } from "next/server";
import { supabase, authReady } from "../../../lib/portal";
import { appOrigin } from "../../../lib/billing";
export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code");
  if (code && authReady()) {
    const db = await supabase();
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${appOrigin()}/account`);
  }
  return NextResponse.redirect(`${appOrigin()}/auth?error=credentials`);
}
