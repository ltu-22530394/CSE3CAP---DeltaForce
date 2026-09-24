# Sprint 4 implementation and handoff

Prepared 24 September 2026 for Yashvir Singh. Scope: DEL-54, DEL-60, DEL-63, DEL-82.

## Included work

The integration branch combines `main` (313462f) with Song's `feature/greyhound-assignment-ui` (5eba5e7), preserving her three frontend commits. The API adapter/README conflicts were resolved. The applicant portal, staff portal, greyhound management, reporting and assignments now use the same SQLite database when VITE_API_URL is configured. Demo mode remains available without that variable; CSV import and account recovery require the API.

- **DEL-54:** persistent assignment UI integration; availability and medical-hold checks; stale revision protection; one active assignment per application; allocation history and notifications. Existing API code is reused.
- **DEL-60:** authenticated staff CSV import, 500 KB/1,000-row limits, quoted-field parsing, per-row validation, case-insensitive duplicate identifier skipping, import batch/error records, UI results and downloadable sample.
- **DEL-63:** transactional outbox for submission, approval, rejection, information requests and allocations. SMTP worker, encrypted queued message bodies, stable message IDs, bounded retries, sanitised failure records and no resend after success.
- **DEL-82:** verification and password-reset pages, resend flows, hashed single-use expiring tokens, rate limiting, generic recovery responses and reset invalidation of existing JWTs. New accounts require verification by default. Existing active accounts are preserved.
- Integration repairs: staff routing uses server roles; the applicant form uses persistent API data; staff receives complete form fields/history/revisions; duplicate submissions and invalid addresses are rejected; drafts are hidden from staff.

## Acceptance and validation

`npm run check`: lint, TypeScript, 54 frontend tests, 26 backend tests and production build passed during implementation. `server/tests/sprint4.node-test.js` exercises a real isolated HTTP API/SQLite database with verification enabled and an injected mail transport. It covers verification/replay, draft persistence, invalid addresses, duplicate submissions, CSV errors/duplicates/permissions, information-request history, stale decisions, assignment constraints, mail failure/retry, expiry and reset session invalidation.

Browser smoke tests used synthetic local accounts/database: staff role login, CSV upload (two records), assignment of an available dog, persistence after reload, and reporting screen. No real customer emails were sent. SMTP inbox delivery and team acceptance remain pending.

## Run locally

Use Node 24+. Copy `.env.example` to `.env`, set JWT_SECRET and STAFF_PASSWORD, then:

```sh
npm ci
npm run init:db
npm run seed:staff
npm run start:api
# in another terminal
npm run dev
```

`seed:staff` creates a new staff account and refuses to overwrite an existing account. Never commit `.env` or the live SQLite database. The schema migration runs at API startup and adds columns/indexes without deleting data. Back up an existing database before deployment. Older allocations do not have an application ID; their dogs remain unavailable, but they are not guessed onto an application. Map historical allocations explicitly if required.

## Email delivery setup still required

Set SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASSWORD, MAIL_FROM and a stable MAIL_ENCRYPTION_KEY locally. APP_ORIGIN and APP_BASE_PATH must identify the real frontend; links use a URL fragment to keep tokens out of server access logs. Port 587 uses required STARTTLS; port 465 normally uses SMTP_SECURE=true.

After verifying the sender/provider and test recipient, set MAIL_WORKER_ENABLED=true and restart the API. It delivers queued messages every 30 seconds. Alternatively `npm run mail:deliver` performs one delivery batch. Five attempts are allowed, with five minutes between failed attempts. Delivery failures remain visible in the notifications table; review provider configuration before manually resetting attempts. SMTP can still deliver twice if the process crashes after provider acceptance but before marking success; stable Message-ID is supplied but is not a provider-level exactly-once guarantee.

For isolated development only, MAIL_TRANSPORT=json selects Nodemailer's non-delivering transport; it must not be used as evidence of real delivery. The automated tests inject their own capture transport. Verification expires after 24 hours; resets after 30 minutes. Password reset does not bypass email verification or reactivate disabled/locked accounts.

## CSV contract — proposed pending client confirmation

Exact headers: `identifier,name,age,sex,status`. Identifier: 1–80 letters, digits, underscores/hyphens. Name: 2–80 characters. Age: integer 1–20. Sex: Male/Female. Status: available/medical_hold. Valid rows import even if others fail; existing identifiers are skipped without overwriting. Medical hold maps to the existing database's unavailable status. The sample is synthetic, not client data. Confirm headers and supported age/sex/status values with Tahsan/client before using a real export.

## Team handoff

- Song: review preservation of frontend changes and the new import/account screens.
- Mahdi: review merge, migration, API contracts and deployment configuration; owns DEL-66 integration.
- Tahsan/Yiting: run acceptance tests on the integrated build, record actual inbox evidence, check responsive behavior and re-test prior defects.
- Yashvir: configure the approved sender, confirm CSV contract, attach the published PR and evidence to the four tickets.

Do not mark the tickets Done solely on these local results. GitHub publication, peer review, actual email delivery and team acceptance must be recorded separately. No external credentials are included in this delivery.
