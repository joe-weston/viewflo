# Growth System Phase A verification

This harness targets the Growth System admin. The November 2 implementation remains the reference for retained acceptance cases. `controller.ts --review` runs read-only checks from the owning repository. The relay candidate uses a fresh event, a reviewed bundle hash and a UTC expiry. Its only browser access path is `relay.ts`, which binds three numeric loopback listeners to fixed app, API and mail destinations through the exact owned Docker gateway container.

| Reference | Prepared coverage |
| --- | --- |
| Legacy local spec, normal Auth | `browser.ts` uses the app email sign-in form, one local SMTP receipt, the real token-hash callback and a normal SSR session. It checks role landing pages, user identities and desktop/mobile overflow. |
| Legacy local spec, CRM persistence | Lead stage save/reload, stale concurrent form, notes, unsent draft and completed task. |
| Legacy local spec, isolation and Storage | Anonymous, foreign and billing mutations denied, cross-tenant data denied, private photo retrieval and expiry checked. |
| Legacy local spec, website draft | Saved draft persists and records its actor. Publication remains empty. Staff and billing are denied. |
| Legacy local spec, revocation | Revoked membership loses browser access, revoked session cannot refresh, and manual sign-out returns to sign-in. |
| Growth System, current source | `growth-cases.ts` covers saved content and linked tracked links, seeded source/date drill-through, quote creation and approval with sending disabled, completion and feedback drafts with sending disabled. |
| Candidate fixture and service wiring | `candidate.ts` renders the six fresh services from the legacy contract with the reviewed Candidate A bindings and resource limits. `seed.ts` prepares one synthetic cohort through a private, exclusive journal and positive ownership/empty baseline callbacks. |
| Evidence boundaries | `boundary.ts` and `browser-proxy.ts` implement exact numeric origins, a redirect boundary, a browser environment allowlist, route-specific masks and status-only child output. The browser driver imports Playwright assertions without running Test Runner. |
| Data-preserving stop | `lease.ts` derives a stop order from exact owned IDs on lease expiry or controller loss. Runtime observation, heartbeat and stop execution remain controller responsibilities. |

The controller checks the source, image and installed Chromium hashes. It keeps Compose credentials in process memory and transmits them over stdin. It records an ACL-verified private lease and starts the one-run guard before creating any service. It binds all six stopped container IDs before starting them, checks for zero Docker port publications and inspects namespace routes, then probes the app, Auth and Mailpit through the relay before migrations. The controller closes the relay before its exact-ID shutdown and retains volumes and receipts for diagnosis.

`relay-probe.ts` exercises the transport with data-free endpoints. It checks that the gateway and mail fixture share one internal isolated network, that they have no IPv4 default route or Docker-published ports, and that the three loopback endpoints return different expected bodies. It stops its two exact containers after the probe. The controller checks the final Postgres TCP listener and the gateway's database, SMTP and template dependencies before starting GoTrue.

`route-probe.ts` reads IPv4 and IPv6 routes for the shell-free PostgREST service. The pinned Node reader shares the exact PostgREST network namespace, with a read-only filesystem, no mounts and no Linux capabilities. It checks the target's identity and sole bridge before and after each read. The reader exits on its own, and its stopped container ID is recorded separately from the six service IDs.

The authenticated run must inspect actual masked screenshots and record its findings. The privacy tests exercise input rejection, environment filtering and child-output limits. The browser redirect proxy and rendered screenshot masks still need runtime validation. Growth settings/editor concurrency, cross-record quote navigation, historical quote evidence, alternate decisions and two overlapping normal-session PostgREST operations remain explicit acceptance cases. The current source regression suite already covers parts of those cases outside the live stack.

Public-intake provider transport, real quote/feedback sending and browser acceptance on a custom-domain HTTPS origin require separate test scope. The immutable image intentionally omits all credentials at build time. The supervisor supplies fresh local Auth settings in its replaced runtime environment, with provider sending disabled.

## Tracked intake through review request

The customer journey uses the existing photo intake and admin screens in a fresh isolated database. The public visitor submits two generated window JPEGs as the bot. The admin uses normal Viewflo Auth with local Mailpit. The customer-test image adds a fixed local security challenge and a loopback-only mail broker. The production application source and signed-off pages are still the pinned base.

Build the customer image offline from the reviewed local snapshot. This controller requires the protected tenant hash manifest, source and migration pins, Docker image receipts and prepared base image described by the runtime review. These workstation-specific receipts are private and ignored by Git.

```powershell
node --import tsx verification/growth-runtime/customer-image.ts --build-customer-image
```

For live checks, set `VIEWFLO_E2E_FROM` to the approved sender and set `VIEWFLO_E2E_RESEND_KEY_FILE` to the path of the private key file. For the approved Pasadena sender `no-reply@mail.pasadenashadesandshutters.com`, `VIEWFLO_E2E_RESEND_DOTENV=1` reads `PASADENA_RESEND_KEY` directly from the ignored repository `.env`. Use one key source. Configure the existing bot grant with `GMAIL_E2E_CREDENTIALS` and `GMAIL_E2E_TOKEN` per the ProdOps shared testing account guide. The runner verifies the bot identity and read scope before creating resources.

Choose one unused event ID per authorized run. The last two digits identify the candidate subnet. Review the exact bundle before launch and use the same event and transport in both commands.

```powershell
$event = '--event=growth-crm-YYYYMMDD-NN'
node --use-system-ca --import tsx verification/growth-runtime/controller.ts --review-customer $event
$expiry = [DateTime]::UtcNow.AddMinutes(35).ToString('o')
node --use-system-ca --import tsx verification/growth-runtime/controller.ts --customer-e2e <bundle-hash> --isolated-loopback-relay $expiry $event
```

For a no-email rehearsal, add `--fixture-mail` to both commands. Fixture receipts carry no Gmail delivery evidence. The controller refuses an event with an existing execution directory. Reconcile prior provider and Gmail records before authorizing any repeat live send. Both modes stop exact owned resources and retain private receipts.

The app's broker accepts only the bot recipient, one ordered claim per phase and stable idempotency keys. The host worker independently enforces the same recipient and the configured sender. It exposes no provider or Gmail credentials to containers or Chromium. The live run succeeds only when Gmail matches all three run-tagged messages and the CRM and analytics checkpoints pass. Receipt files carry IDs and fixed statuses. Provider uncertainty stops the run for reconciliation.
