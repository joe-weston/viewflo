export function customerAppEnv(mailToken, challenge) {
  if (
    ![mailToken, challenge].every(
      (value) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value),
    )
  )
    throw Error("Isolated customer test profile is incomplete");
  return {
    CRM_EMAIL_DELIVERY_ENABLED: "true",
    LEAD_INTAKE_TENANTS: "pasadena-shades-and-shutters",
    LEAD_INTAKE_ENABLED: "true",
    LEAD_INTAKE_HOSTNAMES: "127.0.0.1",
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: "viewflo-synthetic-e2e",
    TURNSTILE_SECRET_KEY: challenge,
    VIEWFLO_E2E_CHALLENGE: challenge,
    RESEND_API_KEY: mailToken,
    NODE_OPTIONS:
      "--import=/app/verification/growth-runtime/customer-preload.mjs",
  };
}
