# Sprint 5 performance evidence

Prepared 5 October 2026 for DEL-72. This change is based on Sprint 4 integration commit b0c6271 (PR #4), which still requires team review and merge. These are local implementation results, not deployment or UAT acceptance.

## Change

The staff application list previously fetched history and assignment separately for every application: 2,001 database queries for 1,000 applications. The list now fetches applications, notes and active assignments in three queries and assembles the same response. Detail lookups retain their existing behavior. No schema migration or API contract change is required.

The existing unique active allocation index guarantees at most one active assignment per application. Notes retain timestamp/row order. Draft, withdrawn and inactive applications remain excluded. Search, status/type filters and sort behavior remain unchanged.

## Measurement

Run `node server/scripts/benchmark-staff.js` with Node 24+. The script creates an isolated synthetic SQLite database with 1,000 applications and three notes per application, performs three warmups followed by 30 measurements per scenario, checks HTTP status and list counts, and deletes the temporary database. Five-way concurrency uses six batches. No real applicant records or SMTP delivery are involved.

Environment: Apple M4 Pro, macOS arm64, Node v24.21.0. Measurements include localhost HTTP, response body read and JSON parsing. They exclude TLS, remote network, browser rendering and real hosting load. p50 and p95 use nearest-rank sample percentiles. Raw before/after files are in `docs/evidence/sprint5/`. Baseline repository implementation: b0c6271, using the same benchmark harness.

| Scenario | Before p50 ms | After p50 ms | Before p95 ms | After p95 ms |
| --- | ---: | ---: | ---: | ---: |
| List 1,000 applications | 66.07 | 17.94 | 73.78 | 22.68 |
| Search for one applicant | 55.83 | 11.58 | 69.64 | 12.14 |
| Single application detail | 0.49 | 0.52 | 0.69 | 0.72 |
| List with five concurrent requests | 325.63 | 81.33 | 341.92 | 98.50 |

List p50 improved by 72.8%; list p95 improved by 69.3%. Single-detail results are effectively unchanged at this scale. Response sizes match before/after for all scenarios. Both versions were already below the documented three-second normal-operation target in this local test. This does not establish production compliance or maximum capacity. The full list response remains about 1.05 MB and still grows with record count; server-side pagination would require a separately agreed contract change.

## Verification

`npm run check` passed on 5 October 2026: ESLint, TypeScript, 54 frontend tests, 27 backend tests and the production build. The additional repository test compares list results with detail results, including ordered history and assigned/unassigned records, private exclusions, case-insensitive search, filters and sorting. Existing HTTP tests continue to cover authentication, roles, workflow and assignment constraints.

## Delivery dependencies

- Mahdi: review the Sprint 4 integration PR and this dependent change, complete DEL-66 integration and DEL-73 deployment.
- Tahsan: complete DEL-67 combined workflow testing and DEL-70 system testing against the final integrated commit.
- Yiting: complete DEL-75 manual, DEL-77 UAT/sign-off and DEL-83 final risk review.
- Yashvir: incorporate review feedback, repeat performance checks on the agreed deployed build, and include evidence in DEL-76/DEL-78.
- SMTP provider configuration and actual verification/reset/notification inbox evidence remain pending. Capture transport tests do not prove real delivery.
- The original Confluence client brief names ASP.NET Core/PostgreSQL; this branch implements Express/SQLite. Record the actual stack and obtain explicit team/client acceptance of the deviation.

DEL-72 should remain In Progress until review and target-environment verification are recorded. Report and presentation should describe the accepted final commit and disclose remaining limitations.
