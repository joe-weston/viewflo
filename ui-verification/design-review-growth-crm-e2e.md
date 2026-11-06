# Growth CRM end-to-end verification

The isolated Playwright run completed normal admin sign-in, tracked-link creation and a visitor click, two-photo intake, source attribution, quote approval and send, recorded acceptance, project completion, feedback send and reconciliation. The campaign finished with one visit, one inquiry, one quote, one win and one completion. Refreshing the visitor landing page and reopening the CRM record preserved those totals. Saving the quote draft left the Quotes count unchanged.

A real delivery run reconciled three distinct provider acceptances and three matching messages in the authorized test inbox. A separate fixture-mail run repeated the full journey with the final capture guard and generated the eight reviewed images. The latter run used in-memory receipt fixtures to avoid duplicating real sends. Private execution receipts retain the exact source, lead, quote, feedback, provider and message IDs.

| View | Desktop and mobile review |
| --- | --- |
| Attributed lead | Both synthetic window photos loaded and remained visible. Original and conversion sources matched. The mobile view stacked the panels. |
| Analytics | The test source showed one visit, inquiry, quote and win. Completion was visible in the funnel and separately verified for the campaign. The unfiltered headline totals included seeded control records. |
| Quote | The quote row showed the synthetic customer, $99 total and provider acceptance on desktop. The narrower table scrolls within its panel for additional columns. |
| Feedback | The completed project and provider-accepted feedback record rendered in both views. Link targets were masked and the synthetic record remained recognizable. |

Both runs used the pinned local application snapshot, an internal Docker network and zero Docker-published ports. The signed-off tenant file hashes matched. Owned services and route readers stopped and the loopback listeners closed. The local fixture volumes and private receipts remain available for review.

The staging-based PR was checked with its committed lockfile. Repository lint and type checking passed, along with 73 repository tests and 10 harness tests. The browser checks targeted the separately prepared Growth System snapshot and its reviewed runtime receipts.
