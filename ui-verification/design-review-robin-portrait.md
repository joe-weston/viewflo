# Robin portrait replacement — October 2, 2026

Coordinator/planner scope: replace only Robin's homepage portrait on staging. Base: origin/staging, 49f86a88e22b8679999b54cde9338fc7b02767cf. Keep the existing new design, copy, links, tenant routing and original assets. The operator explicitly selected staging after requesting the site portrait replacement. Production publication is outside scope.

Product acceptance: the selected ivory-background image appears in the existing owner section; portrait remains clear with the 4:5 crop; mobile and desktop retain layout and accessible image description; reduce bandwidth substantially.

Coder handoff: public/tenants/pasadena/robin-alvarez-portrait.webp and src/components/home/OwnerStory.tsx. PNG preview was 2,087,089 bytes. New WebP is 800 × 1000, quality 82, 66,528 bytes (96.8% smaller). Matching intrinsic dimensions and responsive sizes let Next Image select an appropriate derivative. No other source changes, new permanent tests, secrets or source-snapshot edits.

Tester: npm ci, npm run lint, npm run typecheck, npm test (65 passed), npm run build passed. npm run test:e2e -- tests/e2e/website.spec.ts --grep 'public design' passed on desktop and mobile (2 cases): homepage, responsive navigation, gallery filter and factual copy. A targeted Playwright runner additionally verified the new portrait on the actual routed homepage, image decode, descriptive alt text, no page errors and no horizontal overflow.

UI QA evidence under tmp/ui-verification/robin-portrait/: desktop-owner-story.png, mobile-owner-story.png, desktop-home.png, mobile-home.png, results.json. Viewports 1440 × 1000 at DPR 1 and 390 × 844 at DPR 2. Inspected both owner-section screenshots: PASS for face/hair clarity, ivory background, natural edges, rounded corners, complete crop, caption and responsive spacing; no clipped text or controls. Public homepage needs no application login. No authenticated administrative workflow was changed or claimed verified.

Bandwidth: Next Image WebP derivatives measured 28,288 bytes for desktop (640px) and 36,330 bytes for mobile DPR 2 (750px). Source retains the selected appearance without the multi-megabyte PNG payload.

Reviewer: no findings in the bounded diff. Original portrait remains preserved. Residual limitation: AI background editing is not guaranteed to preserve every original face pixel; operator selected this previously displayed preview.

Staging readiness: PASS for this portrait update after static/build/tests, browser verification and screenshot inspection. Production release and unrelated intake/billing readiness are outside this task. Remote deployment validation will be reported in the current conversation.
