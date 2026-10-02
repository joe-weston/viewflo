# Consultation phone field review

Date: October 2, 2026. Branch: `codex/resend-lead-intake`.

## Scope, planning, and product acceptance

The supplied screenshot shows a surname in the existing phone field. Whether it was entered manually or by browser autofill is unknown. The adjacent name/phone layout made the contact requirements easy to misunderstand, and the original validation message appeared below the submit button.

Acceptance: visitors can distinguish full name from phone number; blank or alphabetic consultation phone entries prevent submission and direct visitors to the editable phone field; a corrected number submits normally; mobile labels and errors remain visible after focus. Phone remains optional for photo intake. No backend validation, tenant boundaries, production configuration, delivery, or authentication changes are in scope.

Coordinator/planner/product-manager disposition: ready for this bounded UI correction. Existing dirty checkout work was preserved on the current task branch. Roles were performed sequentially within this task; no workers or background automation were dispatched.

## Implementation and tester evidence

- `src/components/leads/LeadForm.tsx`: separate full-width contact rows; explicit full-name/phone labels and input names; phone example, telephone keyboard hint, and area-code help; inline accessible phone error; focus and centered scroll to the phone field on rejection. Shared photo intake receives the same contact presentation and retains optional phone behavior.
- `tests/e2e/leads.spec.ts`: updated label locators and added a regression covering blank phone, surname-shaped input, no request on rejection, cleared error after correction, correct name/phone request payload, a single successful submission, and absence of horizontal overflow.
- `npm run lint`: PASS after final code changes.
- `npm run typecheck`: PASS; final `npm run build` also passed its TypeScript check.
- `npm test`: PASS, 54 tests.
- `npm run build`: PASS after final code changes.
- `npm run test:e2e -- tests/e2e/leads.spec.ts`: PASS, 8 tests on the final build, desktop 1440×1000 and mobile 390×844. Preview base URL was port 3192.
- `git -c core.longpaths=true diff --check`: PASS, with Windows line-ending notices.

Public visitor flows require no authentication. Success responses use intercepted API fixtures and synthetic contact data; these checks establish form behavior, not actual storage or email delivery. Repository Playwright was used; the optional agent-browser executable is unavailable.

## UI QA evidence and findings

Inspected screenshots under `tmp/ui-verification/consultation-phone/`: desktop/mobile `contact.png`, `invalid-phone.png`, and mobile `receipt.png`. Shared photo contact screenshots were also inspected under `tmp/ui-verification/resend-lead-intake/`.

The full-name and phone rows are distinct at both sizes. Telephone help and errors wrap legibly. The phone field has `aria-invalid` and associated help/error text; its error is an alert. Correction clears the stale error. Existing consent, Back navigation, optional photo-phone behavior, retry identity, and queued receipt regressions pass. Existing colors, fonts, and control sizes are retained. No horizontal overflow, nested scrolling, cramped controls, or unintended layout change was observed.

Initial screenshot inspection found phone focus could leave its label behind the sticky mobile header. Centered scroll after focus fixed this; final mobile error evidence shows the full label, editable input, example, and error together. Disposition: PASS.

## Review and release disposition

Reviewer: no unresolved findings in this bounded change. Phone validation continues to use the existing shared validator; no server acceptance rules were relaxed. Browser autofill heuristics vary, so explicit semantics and the clarified layout cannot guarantee every saved browser profile will autofill correctly.

Local correction and UI verification: PASS. Production validator: deployment/release not applicable to the requested local correction; no production-ready or delivery verdict issued. No commit, push, PR, migration, external notification, or deployment was performed. Production remains unchanged until a separately authorized release.

## Follow-up: warning on the field and unavailable response

October 2, 2026: added a red border, light red background, and red focus outline to the invalid phone input itself. The warning remains immediately beneath the field and clears with the invalid styling when corrected. The regression now asserts appearance and removal of the warning class. Lint, type checking, all 54 unit tests, build, and all 8 desktop/mobile lead browser checks passed. Updated desktop/mobile invalid-phone screenshots were inspected: field, label, and warning are visible, with no clipping or overflow. Reviewer disposition: no unresolved findings.

The separate “Requests are temporarily unavailable…Your request has not been saved” response is emitted before parsing or saving when `leadReady()` fails. A value-free inspection of the loaded local configuration confirmed intake is not enabled, Turnstile secret/site keys are absent, and allowed intake hostnames are absent; Supabase URL and service-role configuration are present. No secret values were printed or recorded. This confirms the local readiness gate explains the response; it does not inspect a remote deployment's configuration. Intake activation and external setup were not changed.

## Authorized staging deployment preparation

Joseph requested the staging push on October 2, 2026. Isolated this correction on `codex/fix/consultation-phone-staging`, based on current `origin/staging` at `10e9ee2`. The existing dirty main checkout was preserved. The form diff contains only this task's contact changes; staging's later routes, portrait, billing, lead inbox, dependencies, and server implementation remain intact. Existing staging lead tests were preserved with updated labels; the new regression is in `tests/e2e/consultation-phone.spec.ts`.

Exact staging-base validation: `npm ci` PASS using the system CA store with TLS verification enabled; lint PASS; typecheck PASS; 65 unit tests PASS; build PASS; targeted consultation-phone and lead Playwright suites PASS (10 desktop/mobile checks). Fresh desktop/mobile warning screenshots in this worktree were inspected and pass. Diff whitespace check passes. Reviewer: no findings in the four-file deployment scope. Production-validator disposition: PASS for the authorized staging UI deployment only; actual intake activation/storage/email verification remain separate configuration gates. No configuration, migration, delivery, or production change is included. Rollback is a revert of this UI commit on staging, followed by its normal Vercel preview deployment.
