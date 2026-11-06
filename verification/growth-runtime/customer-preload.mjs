// Loaded only in the attested customer-test container.
const token = process.env.RESEND_API_KEY;
const challenge = process.env.VIEWFLO_E2E_CHALLENGE;
if (
  process.env.VIEWFLOW_APP_URL !== "http://127.0.0.1:65170" ||
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "http://127.0.0.1:65171" ||
  !/^[a-f0-9]{64}$/.test(token ?? "") ||
  !/^[a-f0-9]{64}$/.test(challenge ?? "")
)
  throw Error("Isolated customer profile required");
const original = globalThis.fetch.bind(globalThis);
globalThis.fetch = async (input, init) => {
  const url = input instanceof Request ? input.url : String(input);
  if (url === "https://challenges.cloudflare.com/turnstile/v0/siteverify") {
    const req = new Request(input, init);
    const data = new URLSearchParams(await req.text());
    return Response.json({
      success:
        req.method === "POST" &&
        data.get("secret") === challenge &&
        data.get("response") === challenge,
      action: "lead-intake",
      hostname: "127.0.0.1",
    });
  }
  if (url === "https://api.resend.com/emails") {
    const req = new Request(input, init);
    if (
      req.method !== "POST" ||
      req.headers.get("authorization") !== "Bearer " + token
    )
      return Response.json({}, { status: 403 });
    return original("http://127.0.0.1:65175/emails", {
      method: "POST",
      headers: req.headers,
      body: await req.text(),
      signal: req.signal,
      redirect: "error",
    });
  }
  return original(input, init);
};
