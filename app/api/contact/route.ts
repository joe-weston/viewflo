export const runtime = 'nodejs';

const unavailable = 'The online form is temporarily unavailable. Please call 818-618-5288.';
const reply = (status: number, error: string) => Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(request: Request) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
  if (!url || !key || !turnstileSecret || !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) return reply(503, unavailable);

  const origin = request.headers.get('origin');
  const requestUrl = new URL(request.url);
  if (origin !== requestUrl.origin) return reply(403, 'Please submit from this website.');
  if (!request.headers.get('content-type')?.startsWith('application/json')) return reply(415, 'Please use the contact form.');
  if (Number(request.headers.get('content-length') || 0) > 8192) return reply(413, 'The message is too large.');

  let body: Record<string, unknown>;
  try {
    const text = await request.text();
    if (text.length > 8192) return reply(413, 'The message is too large.');
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('invalid');
    body = parsed as Record<string, unknown>;
  } catch {
    return reply(400, 'Please complete the form.');
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const token = typeof body.verification === 'string' ? body.verification : '';
  if (body.website) return reply(400, 'The request could not be accepted.');
  if (name.length < 2 || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || phone.length > 30 || message.length < 5 || message.length > 2000 || body.consent !== true) {
    return reply(400, 'Please check your name, email, message, and contact permission.');
  }
  if (!token || token.length > 2048) return reply(400, 'Please complete the security check.');

  try {
    const challenge = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: new URLSearchParams({ secret: turnstileSecret, response: token }),
      signal: AbortSignal.timeout(8000),
    });
    if (!challenge.ok) return reply(503, unavailable);
    const result = await challenge.json();
    if (result.success !== true || result.action !== 'contact' || result.hostname !== requestUrl.hostname) return reply(400, 'Please complete the security check again.');

    const supabase = new URL(url);
    if (supabase.protocol !== 'https:') return reply(503, unavailable);
    const insert = await fetch(new URL('/rest/v1/contact_submissions', supabase), {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ tenant_slug: 'pasadena-shades-and-shutters', name, email, phone, message, consent_at: new Date().toISOString() }),
      signal: AbortSignal.timeout(10000),
    });
    if (!insert.ok) return reply(503, 'We could not save your request. Please try again or call 818-618-5288.');
    return Response.json({ ok: true }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return reply(503, 'We could not save your request. Please try again or call 818-618-5288.');
  }
}
