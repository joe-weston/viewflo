/** Dependencies come from Supabase on the server; this seam enables lifecycle tests. */
export async function completeManagerLogin({
  verify,
  authorized,
  signout,
}: {
  verify: () => Promise<boolean>;
  authorized: () => Promise<boolean>;
  signout: () => Promise<void>;
}): Promise<"ok" | "expired" | "access"> {
  if (!(await verify())) return "expired";
  try {
    if (await authorized()) return "ok";
  } catch {
    /* Missing membership or database failure cannot grant access. */
  }
  await signout();
  return "access";
}
