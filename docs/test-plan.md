# Test Plan and Evidence

## Automated Checks

Commands: npm run check for lint, TypeScript, frontend tests, backend tests and production build; npm run test:e2e for Chrome browser workflows; npm audit for dependency advisory status.

Password-only revision verified on 11 October 2026: lint, TypeScript, production build, 52 frontend tests, 58 active API/business/security/volume tests and five Chrome workflows pass. Production-mode tests run without SMTP or Microsoft settings. CSS and image assets match the pre-change snapshot.

The complete backend glob still reports five failures and five cancelled tests in staffApplicationApi.node-test.js and staffIntegration.node-test.js. These same failures were reproduced against the untouched pre-change project: obsolete /api/staff routes and an incomplete registration fixture. They are not fixed or silently excluded from npm run check. The 58-test result refers to the active seven API test files only. These are local results, not live deployment certification.

| Area | Representative Checks | Source |
| --- | --- | --- |
| Public application/account | Required details/consent, atomic creation, duplicate email, immediate login without verification | businessIntegration.node-test.js; business.spec.ts |
| Production password login | Bootstrap secrets and password hashing, no public staff signup, unverified applicant login, private password reset, revoked sessions/tokens, disabled accounts, lockout, migration and secret redaction | passwordLogin.node-test.js |
| Authentication | Role/ownership, password length, administrator password reset, session revocation and idle timeout | authApi.node-test.js; businessIntegration.node-test.js |
| Older CRUD API | Draft/ownership, complete modern submission validation, read-only submitted state | applicationApi.node-test.js |
| Profile/correction | Selected contacts do not overwrite protected answers; one-time grant, account email, original date and previous audit value | completion.node-test.js |
| Case workflow | Staff assignment/search, private versus shared notes, revision conflicts, withdrawal/inactive eligibility | completion.node-test.js; completion.spec.ts |
| Resources | Public/active visibility, approval gating, HTTPS links, administrator-only edits | businessIntegration/completion tests |
| Greyhounds/import | All metadata, unknown sex, compatibility, collision checks, malformed CSV/XLSX, formulas/macros/size limits, real Excel values and retained omitted care fields | completion.node-test.js |
| Allocation | Approval/availability checks, unique dog and carer placement, expected/return dates, internal-note privacy, update/end/history | businessIntegration/completion tests |
| Reports | Complete CSV/Excel columns, filters, formula protection, summaries and explicit refusal of disabled weekly email delivery | completion.node-test.js |
| Administration | Staff identity provisioning, secrets omitted, role/status limits, last/self admin protections and session revocation | completion.node-test.js |
| Maintenance | Backup integrity, safe new-target restore, refusal to overwrite, migration foreign-key/content preservation | completion.node-test.js |
| External contracts | No outbound email requests; mocked paginated Salesforce OAuth; removed Microsoft endpoints | externalIntegrations.node-test.js |
| Browser/accessibility | Public submit/login/review/import/allocation, profiles/admin/Excel/reports/maintenance, mobile/tablet/desktop overflow, axe WCAG-rule checks, JS errors and edit dialog | tests/e2e |

## Volume Benchmark

An isolated SQLite test seeds 5,000 distinct applicants/applications and 5,000 greyhounds, checks list/search results and parses a 5,000-row CSV. Prepared query reuse reduced repeated database compilation. A standalone run measured approximately 0.43 s list, 0.40 s application search, 0.05 s dog search and 0.04 s CSV parsing. The final broader check also passed the local three-second target (approximately 1.03 s / 0.89 s / 0.24 s / 0.19 s while other tests ran).

This does not certify HTTP network latency, complete import-write throughput, production concurrency or hardware capacity. Load-test the approved deployment and expected workload before launch.

## Browser Evidence

Browser tests use installed Chrome, isolated ports 4011/5174 and separate timestamped SQLite databases. Screenshots/traces are written to test-results; successful traces are discarded, failed traces retained. Synthetic accounts/resources are used, never actual client credentials.

Layouts are checked at 390px mobile, 768px tablet and 1440px desktop. Automated accessibility checks cover report, administrator, placement, profile/public and greyhound edit views. Fixes include sparse trend-axis labels, keyboard-focusable horizontally scrolling tables, mobile account accessible name and public primary-link contrast.

Automated axe checks are not full WCAG compliance. Manual keyboard, zoom/reflow, screen-reader, media/document accessibility and target-user testing remain required.

## Client UAT Checklist

1. Compare every field and mandatory rule against the client's actual foster form.
2. Approve the replacement of Microsoft SSO/MFA with private staff passwords. Verify real role restrictions, disabled accounts and administrator recovery identity checks.
3. Approve removal of mailbox verification, emailed password recovery, external notifications and weekly email reports. Confirm the portal never claims that an email was delivered.
4. Import the actual Salesforce sample and inspect duplicate/error behavior and the visible-field policy.
5. Test public versus restricted resources with approved, captioned, accessible content.
6. Complete real staff review, placement changes/history and agreed report formatting.
7. Verify HTTPS/proxy behavior, encrypted storage, backups/offsite protection and restore objectives.
8. Approve privacy/terms, retention, branding, support ownership and formal acceptance.

Optional Google identity, video completion, Power BI, scheduled Salesforce sync, adoption/payment/mobile/LMS functionality is not part of this completion claim.
