# Viewflo

Viewflo is a multi-tenant Next.js platform. Pasadena Shades & Shutters is tenant one and its preserved public website is served from this repository.

## Tenant one: Pasadena Shades & Shutters

- Tenant slug: `pasadena-shades-and-shutters`
- Custom domains: `pasadenashadesandshutters.com`, `www.pasadenashadesandshutters.com`
- Exact preserved HTML snapshot: `tenant-sites/pasadena/content/mirror`
- Tenant-owned public assets: `public/tenants/pasadena`
- Local Viewflo preview: `/pasadena-shades-and-shutters`
- On an allow-listed Pasadena hostname, middleware rewrites public page requests to the tenant while keeping browser URLs at their original root paths.

The old standalone Pasadena project has been consolidated into `C:/Users/josep/projects/Viewflo`. Historical non-code material is archived under `files/archive/migrations/pasadena-project-retirement-2026-09-20`.

## Local development

```text
npm ci
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Start the built preview with:

```text
npm start -- --hostname 127.0.0.1 -p 3188
```

The browser suite verifies the exact Pasadena legacy home page and links at the Viewflo tenant path and through a Pasadena `Host` header, plus retained gallery, consultation, service, and photo-intake behavior.

## Architecture and release controls

The platform uses Next.js App Router/TypeScript, Supabase Auth/Postgres/RLS, private Storage where required, and the existing Vercel Viewflo hosting target. Public tenant pages do not require login; administrative access must use approved Supabase authentication and tenant authorization.

See `TENANT-BILLING-READINESS.md`, `IMPLEMENTATION.md`, `LAUNCH-READINESS.md`, and `ui-verification/design-review-pasadena-replacement.md`. No production deployment, domain relink, migration, payment activation, or automatic launch is authorized by the local consolidation.
