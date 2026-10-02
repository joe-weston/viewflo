# Pasadena candidate design review — October 1, 2026

Disposition: **partial; authenticated owner inbox/billing and hosted delivery remain blocked.** Public/local layouts inspected below pass. This is not a production launch or financial approval.

Candidate is based on PR #2's approved design. Visible changes are canonical photo routing, lead form error/step/receipt focus behavior, and billing mode/collection presentation. Existing public/contact content and before/after pairs remain intact. No global font, color or spacing replacement was introduced by integration.

## Browser execution

Built preview: loopback port 3191, Chrome, desktop 1440×1000 and touch mobile 390×844. `npm run test:e2e`: **22 passed, 2 skipped**. Manager magic-link test on desktop was blocked by absent canonical credentials and fresh approved link; mobile is intentionally skipped because the single-use link would be consumed once and mobile then captured in that same authenticated session. No authenticated screenshot exists for this candidate.

Scenarios: consultation project/details/contact validation, back navigation preserving answers, keyboard focus, sending/disabled state and queued receipt; photo email requirement, remove/re-add, save failure and same-identity retry, sent receipt; disabled real intake/retry protection and retired API; service/legal pages and unknown/growth 404s; all fifty legacy non-home redirects; gallery filter and all approved before/after sliders by keyboard/drag/touch; login, expired-link and unavailable-workspace pages; clean custom-domain auth paths and hostile callbacks. Public form browser success/error responses were intercepted fixtures; they do not prove provider delivery. Billing component history/empty/loading/unavailable renders were explicitly marked synthetic and created no public bypass route.

## Inspected screenshots

Evidence copied unchanged from the suite into `tmp/ui-verification/pasadena-release-candidate/` with these subfolders:

| Scenario inspected             | Screenshot(s)                                                               | Observation                                                                                                                                        |
| ------------------------------ | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Desktop consultation contact   | `resend-lead-intake/desktop-consultation-contact.png`                       | Clear labels, inline consent, summary and separate Back/submit controls; no overlap                                                                |
| Mobile focused contact         | `resend-lead-intake/mobile-consultation-contact-viewport.png`               | Email remains readable and focused below sticky navigation; controls span available width                                                          |
| Mobile queued receipt          | `resend-lead-intake/mobile-consultation-queued.png`                         | Saved receipt distinguishes queued email and explains no resubmission; reference wraps within card                                                 |
| Desktop selected photo         | `resend-lead-intake/desktop-photo-selected.png`                             | Preview, remove control and optional choices remain clear; full-page capture reflects existing scrolled sticky header                              |
| Mobile photo retry             | `resend-lead-intake/mobile-photo-error-viewport.png`                        | Error below submit is visible and readable; retry retains answers and identity                                                                     |
| Mobile billing history fixture | `admin-billing-magic-link/mobile-billing-history-fixture.png`               | Stacked summary and issued invoice cards; date/status/amount/link readable; synthetic label visible                                                |
| Desktop unavailable fixture    | `admin-billing-magic-link/desktop-billing-unavailable-fixture.png`          | Configuration failure does not imply payment; disabled management action and history error visible                                                 |
| Mobile home                    | `pasadena-magic-replacement/mobile-home.png`, cropped `mobile-home-top.png` | Inspected original top at readable resolution; heading, CTAs, hero and local credentials fit; full long screenshot also reviewed for section order |
| Desktop gallery                | `pasadena-magic-replacement/desktop-gallery.png`                            | Five approved comparisons, filters and downstream CTAs preserved                                                                                   |

Other suite screenshots for project/details/sending/photo empty/error/receipt, five services, privacy/terms, gallery filtered/sliders, and login states remain in the same evidence subfolders. No real client data, secrets, bearer links or card data were included. `tmp` remains ignored by Git; these paths refer to local evidence, not hosted screenshots.

## Findings and accessibility

No blocking visual defect found in the inspected local states. Browser assertions found no horizontal overflow in tested public/form states, and no page errors. Input labels, native required fields, fieldset grouping, explicit consent, visible keyboard focus, form alert/receipt focus, disabled sending controls and button sizes remain usable at the tested widths. Focus on a new consultation step and saved receipt was added to avoid leaving keyboard users in a vanished control. Gallery sliders retain keyboard and touch support.

Blocked: actual Supabase-authenticated owner inbox, private photo, document assent, real test/live billing/portal/history, and real Turnstile states. Missing credentials are not a waiver; the fixture screenshots cannot satisfy those gates. Repeat authenticated desktop/mobile workflow capture and inspect every changed state after approved staging configuration. No final UI or production approval is issued.
