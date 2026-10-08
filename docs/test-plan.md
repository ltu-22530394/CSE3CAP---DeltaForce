# Test Plan and Evidence

## Automated Checks

Commands: npm run check for lint, TypeScript, frontend tests, backend tests and production build; npm run test:e2e for Chrome browser workflows; npm audit for dependency advisory status.

Current unit/API evidence: 52 frontend tests and 49 backend/volume tests pass, along with lint, TypeScript and build. Four browser workflows pass, including home portal selection, role-specific login, and scrolling across 320-1920px widths and short laptop screens. No known dependency vulnerabilities were reported by npm audit on 8 October 2026. These are local results, not production certification.

| Area | Representative Checks | Source |
| --- | --- | --- |
| Public application/account | Required details/consent, atomic creation, duplicate email, verify before login | businessIntegration.node-test.js; business.spec.ts |
| Authentication | Role/ownership, password length, reset links, session revocation and idle timeout | authApi.node-test.js; businessIntegration.node-test.js |
| Older CRUD API | Draft/ownership, complete modern submission validation, read-only submitted state | applicationApi.node-test.js |
| Profile/correction | Selected contacts do not overwrite protected answers; one-time grant, account email, original date and previous audit value | completion.node-test.js |
| Case workflow | Staff assignment/search, private versus shared notes, revision conflicts, withdrawal/inactive eligibility | completion.node-test.js; completion.spec.ts |
| Resources | Public/active visibility, approval gating, HTTPS links, administrator-only edits | businessIntegration/completion tests |
| Greyhounds/import | All metadata, unknown sex, compatibility, collision checks, malformed CSV/XLSX, formulas/macros/size limits, real Excel values and retained omitted care fields | completion.node-test.js |
| Allocation | Approval/availability checks, unique dog and carer placement, expected/return dates, internal-note privacy, update/end/history | businessIntegration/completion tests |
| Reports | Complete CSV/Excel columns, filters, formula protection, summaries, weekly deduplication and durable attachment | completion.node-test.js |
| Administration | Staff identity provisioning, secrets omitted, role/status limits, last/self admin protections and session revocation | completion.node-test.js |
| Maintenance | Backup integrity, safe new-target restore, refusal to overwrite, migration foreign-key/content preservation | completion.node-test.js |
| External contracts | Local SMTP success/failure; mocked paginated Salesforce OAuth; signed Microsoft tokens, PKCE/state binding and single-use handoff | externalIntegrations.node-test.js |
| Browser/accessibility | Public submit/verify/review/import/allocation, profiles/admin/Excel/reports/maintenance, mobile/tablet/desktop overflow, axe WCAG-rule checks, JS errors and edit dialog | tests/e2e |

## Volume Benchmark

An isolated SQLite test seeds 5,000 distinct applicants/applications and 5,000 greyhounds, checks list/search results and parses a 5,000-row CSV. Prepared query reuse reduced repeated database compilation. A standalone run measured approximately 0.43 s list, 0.40 s application search, 0.05 s dog search and 0.04 s CSV parsing. The final broader check also passed the local three-second target (approximately 1.03 s / 0.89 s / 0.24 s / 0.19 s while other tests ran).

This does not certify HTTP network latency, complete import-write throughput, production concurrency or hardware capacity. Load-test the approved deployment and expected workload before launch.

## Browser Evidence

Browser tests use installed Chrome, isolated ports 4011/5174 and separate timestamped SQLite databases. Screenshots/traces are written to test-results; successful traces are discarded, failed traces retained. Synthetic accounts/resources are used, never actual client credentials.

Layouts are checked at 390px mobile, 768px tablet and 1440px desktop. Automated accessibility checks cover report, administrator, placement, profile/public and greyhound edit views. Fixes include sparse trend-axis labels, keyboard-focusable horizontally scrolling tables, mobile account accessible name and public primary-link contrast.

Automated axe checks are not full WCAG compliance. Manual keyboard, zoom/reflow, screen-reader, media/document accessibility and target-user testing remain required.

## Client UAT Checklist

1. Compare every field and mandatory rule against the client's actual foster form.
2. Verify real Microsoft identities, role restrictions, disabled accounts and tenant MFA.
3. Confirm actual verification/approval/allocation/rejection emails reach the approved mailbox with agreed wording.
4. Import the actual Salesforce sample and inspect duplicate/error behavior and the visible-field policy.
5. Test public versus restricted resources with approved, captioned, accessible content.
6. Complete real staff review, placement changes/history and agreed report formatting.
7. Verify HTTPS/proxy behavior, encrypted storage, backups/offsite protection and restore objectives.
8. Approve privacy/terms, retention, branding, support ownership and formal acceptance.

Optional Google identity, video completion, Power BI, scheduled Salesforce sync, adoption/payment/mobile/LMS functionality is not part of this completion claim.
