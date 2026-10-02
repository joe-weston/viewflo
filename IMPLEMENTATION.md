# Pasadena replacement website — 2026-09-06

## Authority and scope
Direct Joe instruction through originating task 01a0773b-80d4-7280-adf8-e610f042dd8c. Implement a NEW public website, including real photo-to-quote intake, on codex/pasadena-replacement from 997e5d5. Do not deploy, merge, contact clients, send test notifications, or activate recurring workers. Main and source exports remain unchanged.

## Source identity
Primary: C:/Users/josep/projects/Viewflo/files/exports/pasadena-mvp, README design https://www.magicpatterns.com/c/3e51vhqs71zuujkx9x8uyv. Its Home hero and SendPhotos page match Joe's identifying photo-to-quote requirement. The exported uploader adds fake filenames and simulates receipt; these are prototype behavior, not a live integration. The companion four-phase reference is a source for recovering truncated data only. Neither export proves final Robin approval of every image, claim, or version.

Meeting source: files/source/meetings/08252023-Joe-Robin-01M08JKDP2MQ77K6DKMV1TAR9Q.txt, lines 119, 179, 209, 215: phase-one website, photo leads, source design/FIDM context, human follow-up before later estimation automation. Filename date is retained as supplied, not independently verified.

## Planning and product gates
Visitors can understand services, inspect projects, request consultation, upload actual window photos, correct validation errors, see progress and truthful success/failure. Preserve the cream/walnut/brass palette, Fraunces/Inter typography, layouts and prominent two-action journey. Replace prototype contact data, prices, review counts, promises and fictional case studies with existing site evidence or neutral request-based wording.

Affect app routes/layout/SEO, imported src components/data, public assets, server intake, migration and tests. Preserve all known old URLs through exact routes or permanent mappings. Unknown URLs must 404. No CMS, billing, automated quote generation, unrelated ViewFlow portal or authentication replacement.

## Architecture gate
Existing app is a Next.js mirror with Wufoo contact forms and Vercel Analytics. No owning-checkout .env file or existing authenticated intake exists at inspection. New photo requests use a server-only Supabase adapter: private bucket, normalized images with metadata stripped, RLS-protected request rows, bounded body/file counts and sizes, anti-abuse verification and idempotency. Customer contact/photos never enter analytics. No cloud schema/storage mutations authorized in this run; missing approved Supabase and anti-abuse configuration returns an honest unavailable response. Existing Wufoo contact form was independently checked and returns a provider error; consultation now uses phone contact and the photo route pending an owned form decision. Admin recipient/review ownership and staging receipt must be verified before launch.

## Validation and release
Required: lint, typecheck, unit/API tests, build, public Playwright routes/menu/FAQ/photo selection/error/progress/receipt, desktop/mobile screenshots and inspection, security/code/UI review. Authenticated receipt validation is blocked until an approved intake environment and credentials exist; never bypass auth. Rollback is leaving production at 997e5d5; this branch is not deployed.

Launch requires fourteen FULL VERIFIED days of measurement, final client/design/content approval, operational intake owner and retention policy, staging receipt proof, all quality gates, and a separate explicit launch instruction. GA ownership does not block implementation. Valinor task 01a0773c-ba82-7561-84be-bc4d62286867 owns measurement records; installation/deployment timestamps do not prove collection start.

## Worker disposition
Read shared daily-technical-worker.md. Pasadena files/admin/technical-worker.json is absent: scheduled worker readiness_blocked, no claim or queue read claimed. This is the manually authorized implementation run; no worker self-activation.
