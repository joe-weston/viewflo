import assert from 'node:assert/strict';
import { test } from 'node:test';
import { POST } from '../app/api/contact/route.ts';

const originalFetch = globalThis.fetch;
const values = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
};

const payload = { name: 'Test Visitor', email: 'VISITOR@example.com', phone: '8185550100', message: 'I would like a consultation.', consent: true, verification: 'challenge' };
const request = (body = payload, origin = 'https://www.pasadenashadesandshutters.com') => new Request('https://www.pasadenashadesandshutters.com/api/contact/', {
  method: 'POST',
  headers: { origin, 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

test('contact intake verifies challenge and writes only to the Pasadena tenant', async () => {
  process.env.SUPABASE_URL = 'https://supabase.example';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only-key';
  process.env.TURNSTILE_SECRET_KEY = 'test-only-secret';
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'test-only-site';
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('siteverify')) return Response.json({ success: true, action: 'contact', hostname: 'www.pasadenashadesandshutters.com' });
    return new Response(null, { status: 201 });
  };
  try {
    const saved = await POST(request());
    assert.equal(saved.status, 201);
    assert.equal(calls.length, 2);
    assert.equal(calls[1].url, 'https://supabase.example/rest/v1/contact_submissions');
    assert.deepEqual(JSON.parse(calls[1].options.body), {
      tenant_slug: 'pasadena-shades-and-shutters',
      name: 'Test Visitor', email: 'visitor@example.com', phone: '8185550100', message: 'I would like a consultation.',
      consent_at: JSON.parse(calls[1].options.body).consent_at,
    });

    calls.length = 0;
    assert.equal((await POST(request(payload, 'https://other.example'))).status, 403);
    assert.equal(calls.length, 0);
    assert.equal((await POST(request({ ...payload, website: 'spam.example' }))).status, 400);
    assert.equal(calls.length, 0);

    globalThis.fetch = async () => Response.json({ success: true, action: 'contact', hostname: 'other.example' });
    assert.equal((await POST(request())).status, 400);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
