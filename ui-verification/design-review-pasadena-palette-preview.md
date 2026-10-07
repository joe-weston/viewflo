# Pasadena palettes and neutral preview banner — October 7, 2026

## Scope and product acceptance

Use Coastal teal as Pasadena's default palette. In staging/development provide a collapsible overlay to compare Coastal teal, Sage & linen, Pacific blue, and California clay, remember the tab's selection across navigation/reload, and reset to recommended. Keep the preview banner white with fixed charcoal text across every palette. Explicit production disables both the overlay and preview banner and ignores stored staging preferences.

The publication diff is prepared from staging commit `1e85dc1` in an isolated worktree. This preserves the current modern homepage, routing, portrait, copy, billing, lead intake, and analytics. The older dirty primary checkout and its unrelated uncommitted changes remain untouched. The active staging renderer has no legacy HTML pages; legacy-specific recoloring is excluded from this PR. No dependencies, schema, authentication, backend, image assets, font families, font weights, spacing, or business content change.

## Implementation and configuration

Tenant-scoped CSS variables drive existing Tailwind color utilities with their original fallback values outside Pasadena. Added `PasadenaTheme`, the server-side `isPalettePreviewEnabled` helper, its unit test, browser tests, and `app/pasadena-theme.css`. Only public Pasadena rendering receives the theme wrapper; admin/platform routes remain outside it. The banner uses literal white and charcoal colors, independent of palette variables.

`VERCEL_ENV=preview` enables the review controls automatically. Dedicated staging can set `VIEWFLO_ENV=staging`; local development also enables them. Either `VERCEL_ENV=production` or `VIEWFLO_ENV=production` always disables them. Only a boolean reaches the client, never environment values. Session storage accepts only the four known IDs and safely tolerates denied storage. No hosted configuration was changed.

## Validation

- Clean `npm ci`: pass, with Node's Windows system CA trust enabled; certificate validation was not disabled.
- Scoped `prettier --check`, `npm run lint`, `npm run typecheck`, and `npm run build`: pass.
- `npm test`: 73 pass, zero failures.
- Staging-mode palette and lead browser scenarios: 12 pass across desktop/mobile. Includes four schemes on home/consultation, fixed banner foreground/background, live button recoloring, reset, Escape/focus return, persistence, invalid stored value, no overlay on admin/platform routes, consultation steps/receipt, photo remove/retry, and fail-closed endpoints. Lead receipt tests use existing intercepted fixtures and do not claim live delivery.
- Production-mode palette checks: two pass, proving no overlay and stored choices ignored.
- `tests/e2e/website.spec.ts` against the production-mode server: six pass, including responsive navigation, gallery filters, service/legal/404 routes, all 50 legacy redirects, custom-domain canonical behavior, robots and sitemap. The initial mixed staging run failed its two production-only no-preview-banner assertions; rerunning this suite in its intended production mode passed without weakening assertions.
- Scoped secret-pattern scan and manual source/security review: no findings. No environment secret files were copied to this checkout or included in the diff. No new network call, API endpoint, data write, or privileged operation is introduced.
- Full dependency audit: **FAIL**, unchanged staging lockfile baseline: 18 entries (17 high, 1 moderate, zero critical). Production-only audit: **FAIL**, five high entries, zero moderate/critical. Four root advisories: braces `GHSA-vfj7-8cjw-p6xm`, postcss-selector-parser `GHSA-rj75-hqrm-r3gf`, sharp `GHSA-wq5f-xc86-pv6w`, source-map-js `GHSA-68fv-2mgg-jv7q`; other entries inherit them. Raw reports are ignored under `tmp/pr-preparation/`. No audit suppression or accepted exception is claimed.

All affected workflows are public and require no login. Private authenticated workflows are unchanged and excluded from this bounded UI scope. Local production-mode tests are not a production deployment.

## Inspected UI evidence

Under `tmp/ui-verification/pasadena-palette-preview/`:

- `{desktop,mobile}-{coastal,sage,pacific,clay}-{modern,home}.png` — 16 full-page screenshots, consultation and current staging home, 1440×1000 and 390×844 viewports.
- `{desktop,mobile}-production.png` — production-mode Coastal teal without review controls.
- `{desktop,mobile}-{modern,home}-comparison.png` — contact sheets inspected for all four schemes and both viewports.

Banner remains white/charcoal throughout and has no decorative border. Site fonts and layout remain unchanged. No horizontal overflow, clipped controls, or nested scroll container was found. Select text is 16px and controls are at least 44px tall. Native select/button keyboard access and Escape/focus behavior pass. Expanded review overlay intentionally covers part of the page and starts collapsed. No unresolved UI finding.

## Role gates and publication disposition

Coordinator, planner, product manager, coder, tester, UI QA, code-quality review, scoped source-security review, and reviewer: pass for the bounded palette/banner change. Review was a separate pass in this task; no subagents were used. Diff preserves tenant providers and canonical behavior, avoids shared mutable request state, and has no dependency or unrelated implementation churn.

Production-validator verdict: **partial**. Feature checks pass; dependency audit is a pre-existing blocker to PR publication under the shared standard. Joseph's request authorizes commit/push and a PR to staging, but does not waive the audit gate. PR creation awaits an explicit narrow PR-only exception or dependency remediation. No merge, production deployment, migration, invoice, client communication, or activation is authorized. Rollback is a revert of the single palette commit; Joseph owns publication decisions.
