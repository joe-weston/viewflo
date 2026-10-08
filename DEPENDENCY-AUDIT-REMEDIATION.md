# Staging dependency audit remediation

Date: 2026-10-07
Branch: `codex/fix/staging-dependency-audit`
Base: `origin/staging` at `1e85dc175b25639cc8f1911f4986f1929d4d5d24`
Disposition: partial; production dependency audit passes, full dependency gate remains blocked. Joseph explicitly requested a PR to staging after disclosure of these findings on 2026-10-07. That request authorizes committing, pushing, and opening this patch as a draft for review despite the remaining checks; it does not accept the vulnerabilities or authorize merge or deployment.

## Scope and planning

The request is to address the dependency audit blocking PR creation. Work is isolated from the unrelated dirty primary checkout. Scope is compatible dependency remediation, lockfile updates, validation, an accurate remaining-risk assessment, and the subsequently requested draft PR to staging. Acceptance requires a clean production audit and a full audit without unresolved high findings before readiness can pass. No application behavior, auth, data policies, migrations, hosting, merge, or deployment is included.

Role sequence applied in this bounded local task: project coordinator, planner, architect, coder, tester, security reviewer, reviewer. No architecture boundary changes are needed for compatible updates. Regression risks are native image decoding/resizing, CSS source-map generation, and lint configuration compatibility. Rollback consists of reverting this task's manifest and lockfile diff and reinstalling from the restored lockfile.

## Audit results

The quoted 17 high / 1 moderate result does not reproduce on current remote staging. Registry advisories and staging have changed; this task uses a fresh audit of the fetched remote base.

| Audit                     | Remote staging baseline | After remediation  |
| ------------------------- | ----------------------- | ------------------ |
| Full dependency graph     | 9 high, 2 moderate      | 7 high, 2 moderate |
| Production (`--omit=dev`) | 2 high, 0 moderate      | 0 vulnerabilities  |

Counts are npm package entries, including propagation through dependent packages; they are not counts of independent vulnerabilities. The remaining entries originate in two upstream advisories.

## Changes

- Raised the direct `sharp` minimum from `^0.35.4` to `^0.35.5`; lockfile resolves patched Sharp and its native/libvips packages. This addresses [GHSA-wq5f-xc86-pv6w](https://github.com/advisories/GHSA-wq5f-xc86-pv6w).
- Updated `source-map-js` from 1.2.1 to patched 1.2.2 within its existing transitive range, addressing [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q).
- The compatible audit refresh updated `eslint-config-next` and its plugin from 16.3.8 to 16.4.0. Next itself remains 16.3.8. The current ESLint plugin still depends on the vulnerable glob chain.
- Formatted the two modified JSON files. No forced major upgrade, advisory suppression, dependency omission, or custom package substitution was used.

## Remaining blockers and next remediation

1. **High: braces recursion denial of service.** [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) affects the latest published `braces`, 3.0.3. At verification time the advisory lists no patched version. The seven high npm entries are `braces`, `chokidar`, `micromatch`, `fast-glob`, `tailwindcss`, `@next/eslint-plugin-next`, and `eslint-config-next`. Tailwind 3 and the Next ESLint plugin both pull in this chain. These are development/build dependencies, but remain covered by the shared full-graph gate.
2. **Moderate: selector parser CPU exhaustion.** [GHSA-rj75-hqrm-r3gf](https://github.com/advisories/GHSA-rj75-hqrm-r3gf) affects `postcss-selector-parser` below 7.1.6. Tailwind 3 and `postcss-nested` require the 6.x line. The two moderate entries are the parser and `postcss-nested`.

Removing the Tailwind findings requires a tested CSS-tooling migration, such as Tailwind 4, with desktop/mobile visual comparison and authenticated portal verification. That alone does not remove the Next ESLint plugin's `fast-glob` chain: npm proposes downgrading `eslint-config-next` to 14.2.35, which is incompatible with the current flat-config setup and is not an appropriate automatic fix for this Next 16 app. A complete migration must preserve equivalent Next lint coverage through patched upstream tooling or a separately reviewed replacement. Until then, a policy exception would need explicit operator approval under the shared standard; none is assumed or recorded here.

## Validation and review

| Check                                             | Result                                                                                                                                      |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci`                                          | Pass; clean lockfile-enforced installation                                                                                                  |
| `prettier --check package.json package-lock.json` | Pass                                                                                                                                        |
| `npm run lint`                                    | Pass                                                                                                                                        |
| `npm run typecheck`                               | Pass                                                                                                                                        |
| `npm test`                                        | Pass; 72 tests, including native Sharp normalization, invalid-image rejection, metadata stripping, intake boundaries, and tenant/RLS checks |
| `npm run build`                                   | Pass; production compilation, TypeScript, and static page generation                                                                        |
| `npm audit --omit=dev`                            | Pass; zero vulnerabilities                                                                                                                  |
| `npm audit`                                       | Fail; 7 high and 2 moderate development/build entries                                                                                       |
| `git diff --check`                                | Pass                                                                                                                                        |
| UI verification                                   | Not applicable to this dependency-only patch; UI migration was not performed                                                                |
| Dedicated secret/source scanning                  | Blocked; no configured repository commands or available Gitleaks/Semgrep executable found                                                   |

Audit access used Node's system certificate trust (`--use-system-ca`); TLS verification was not disabled. Temporary cache and JSON reports remain in ignored `tmp/`, inside this worktree. Install output also reports existing deprecated packages; these were not replaced in this bounded patch.

Security review: production image-processing and source-map advisories are remediated. Auth, tenant isolation, data access, and secret configuration are unchanged. No secrets were copied or printed. The unresolved high tooling finding is a blocking security finding; passing the production audit alone does not dispose it.

Reviewer disposition: no additional findings in the compatible dependency diff. Full dependency scanning and dedicated scanning remain unresolved gates. This is a partial remediation opened for review at Joseph's explicit request, not a merge-ready or production-ready verdict. Existing staging has not been changed remotely.
