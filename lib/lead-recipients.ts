import { emailPattern } from "./lead-fields";
// Caller supplies service-role lookups. No recipient is taken from visitor input or global tenant defaults.
export async function resolveOwnerRecipients(
  memberships: () => Promise<{ user_id: string; role: string }[]>,
  user: (
    id: string,
  ) => Promise<{ email?: string; email_confirmed_at?: string } | null>,
) {
  const recipients: string[] = [];
  for (const member of await memberships()) {
    // Current inbox RLS grants owner access only; do not email a member who cannot open the inquiry.
    if (member.role !== "owner") continue;
    const identity = await user(member.user_id);
    if (
      !identity?.email_confirmed_at ||
      !identity.email ||
      !emailPattern.test(identity.email)
    )
      continue;
    recipients.push(identity.email.toLowerCase());
  }
  const unique = [...new Set(recipients)];
  if (!unique.length || unique.length > 5)
    throw new Error("Authorized recipients unavailable");
  return unique;
}
