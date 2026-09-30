# Viewflo Repository Instructions

This is the single owning repository for the Viewflo multi-tenant platform and its first tenant, Pasadena Shades & Shutters.

## Ownership

- Repository: `C:/Users/josep/projects/Viewflo/repos/viewflo`
- Remote: `joe-weston/viewflo`
- Current task branch: `codex/tenant-billing-agreements`
- Project files: `C:/Users/josep/projects/Viewflo/files`
- Pasadena tenant snapshot: `tenant-sites/pasadena/content/mirror`
- Pasadena public assets: `public/tenants/pasadena`
- Pasadena UI evidence: `tmp/ui-verification/pasadena-replacement`
- Design review: `ui-verification/design-review-pasadena-replacement.md`

The retired `C:/Users/josep/projects/pasadena` folder is not a source checkout. Do not recreate it or refer implementation work to it.

## Stack And Boundaries

Next.js App Router/TypeScript, Node 24, npm lockfile, Supabase Auth via `@supabase/ssr`, Postgres/RLS, private Storage for photo intake, and a Stripe test-only adapter. Public Pasadena pages require no login. Administrative access uses approved Supabase authentication and tenant authorization; never invent or bypass login.

Custom-domain routing must only map allow-listed hostnames. Preserve platform routes and static assets. Legacy HTML is trusted repository-owned source; never render user-provided HTML. Keep local paths, secrets, service keys, and customer data out of browser output and Git.

Hosting remains the existing Vercel Viewflo project. Do not commit, push, merge, deploy, relink hosting, apply migrations, activate production intake, bill, or notify clients without explicit authority. Draft agreements cannot be accepted or published.

## Commands

- Install: `npm ci`
- Develop: `npm run dev`
- Lint: `npm run lint`
- Type check: `npm run typecheck`
- Unit/API tests: `npm test`
- Build: `npm run build`
- Browser tests: `npm run test:e2e`
- Built preview: `npm start -- --hostname 127.0.0.1 -p 3188`

Follow `C:/Users/josep/projects/.agents/prodOps/development-workflow.md` and the project-level `AGENTS.md`. Visible work requires desktop/mobile Playwright evidence, screenshot inspection, and a written design review. Authenticated verification requires securely configured credentials; report it blocked if absent and never bypass it.

Receipt fixtures prove UI behavior only, not delivery to Supabase or a client. Production release remains separately gated by approved configuration, security verification, measurement, client decisions, and explicit launch authority.
