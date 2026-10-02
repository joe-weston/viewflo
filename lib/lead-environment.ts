export type LeadEnvironment = "staging" | "production";
export const stagingMailbox = "jocduplbot@gmail.com";
// Missing/inconsistent configuration fails closed; preview/local cannot opt into production.
export function leadEnvironment(
  env: Record<string, string | undefined> = process.env,
): LeadEnvironment | null {
  if (env.VERCEL_ENV !== "production" && env.LEAD_ENVIRONMENT === "staging")
    return "staging";
  if (env.VERCEL_ENV === "production" && env.LEAD_ENVIRONMENT === "production")
    return "production";
  return null;
}
export function deliveryRecipient(
  environment: LeadEnvironment,
  recipient: string,
) {
  return environment === "staging" ? stagingMailbox : recipient;
}
