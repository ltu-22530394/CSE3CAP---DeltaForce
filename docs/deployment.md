# Deployment and Recovery

This proof of concept needs client approval and security review before real personal information is used.

## Setup

Use Node.js 24+. Run npm ci, npm run check and npm run build. Local npm run dev starts API/Vite. Production npm run start:api serves the API and built SPA from dist. Run one API process against a protected persistent SQLite volume.

Configure from .env.example; never commit secrets or expose them through VITE_ variables. Production requires NODE_ENV=production, random JWT_SECRET of at least 32 characters, exact HTTPS APP_ORIGIN. Applicant and staff email/password login work without Brevo, SMTP or Microsoft configuration. The local demo staff account is disabled in production.

Use an HTTPS reverse proxy. TRUST_PROXY_HOPS must match the trusted topology; use 1 only for one trusted proxy. Forward X-Forwarded-Proto and restrict direct backend access. Production rejects insecure requests except health. Verify actual TLS, headers, CSP, origin and redirects after deployment.

Put GAPS_DB_FILE and BACKUP_DIR outside publicly served directories on access-restricted encrypted persistent storage. Protect database/WAL/SHM, backups, report attachments and audit. File mode flags alone are not Windows ACLs or encryption; configure host permissions explicitly. Never store backups in dist.

## Administrator Setup

Privately configure BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_NAME and BOOTSTRAP_ADMIN_PASSWORD in the hosting environment. Use a unique password of at least 16 characters and at most 72 UTF-8 bytes. A fresh database creates one administrator. Never put these values in GitHub, browser-exposed variables or public registration.

Bootstrap does not replace an existing password, promote an applicant or reactivate disabled accounts. An exact matching active, passwordless administrator can initialise its first password when migrating from Microsoft. Other existing staff can be assigned passwords through Administration > Accounts by an administrator. Keep a second trusted administrator for recovery. The bootstrap settings cannot reset a forgotten existing administrator password.

Sign in at /staff/login with the configured email/password. Create other staff/admin accounts under Administration > Accounts. A valid email and an 8-character minimum password (maximum 72 UTF-8 bytes) are required. Confirm the person's identity outside the website before resetting a password; communicate it through a private channel. Resetting revokes sessions and old recovery tokens. Resetting your own password signs you out.

Public registration always creates applicants. Existing active unverified applicants can sign in immediately; this does not claim their mailbox was verified. Disabled accounts remain blocked.

## Providers

Microsoft SSO has been removed. No tenant, app registration, client secret or callback is needed. Original SSO/MFA requirements are not met by this version and need client approval.

Email delivery has been removed. Delete obsolete SMTP_*, EMAIL_* and MICROSOFT_* deployment variables; old values are ignored. No verification or password-reset email is sent. Public recovery/verification endpoints return an explicit unavailable response, and the website directs users to administrator assistance. Business events retain local notification history, labelled stored rather than sent; legacy token-bearing bodies are not exposed. Historical database columns/tables remain to avoid deleting existing data.

Salesforce: validate real exports first. Optional read-only OAuth connector needs approved integration/run-as permissions, HTTPS My Domain, object/API version and actual field mapping. Preview/confirm is manual. No scheduled sync/write-back exists.

## Render Free Demonstration

Use the repository root, Node.js 24, build command `npm ci --include=dev && npm run build`, start command `npm run start:api`, and health path `/api/health`. Set APP_ORIGIN to the actual assigned HTTPS URL with no trailing slash. Leave API_PORT unset so Render supplies PORT. Keep production JWT, proxy and bootstrap settings above.

For Free, use GAPS_DB_FILE=server/data/gaps.sqlite and BACKUP_DIR=server/backups. Render Free has no persistent disk: local SQLite and backups disappear on restart, redeploy or idle spin-down. Bootstrap credentials recreate the first administrator when the database is recreated, not applicant records. This is suitable only for disposable demonstrations. Do not store real applications. See [Render Free limitations](https://render.com/docs/free).

For reliable storage, use one paid service with a persistent disk mounted at /var/data and database/backup paths under that mount, plus protected offsite backups. Deploy this updated version from GitHub; Render does not read a local Downloads folder.

## Backup and Recovery

BACKUP_ENABLED defaults true. While the API runs, backup executes daily at 02:00 in APP_TIMEZONE (Australia/Sydney by default). Administration can create one immediately. SQLite online backup includes committed WAL data; integrity and foreign keys are checked and maintenance status recorded.

Jobs do not run while the API is stopped and do not backfill missed schedules. Agree recovery objectives/retention, process supervision, alerts, storage monitoring and encrypted offsite copies. No automatic deletion interval is invented.

Recovery procedure:

1. Stop the API and preserve its original database plus WAL/SHM files.
2. Select a verified backup and a NEW, non-existing target.
3. Run the restore command:

~~~powershell
npm run restore:db -- --source "D:\ProtectedBackups\gap-backup.sqlite" --target "D:\ProtectedData\gap-recovered.sqlite"
~~~

4. The CLI validates database type, integrity and foreign keys; it never overwrites existing files.
5. Inspect the recovered counts/permissions in isolation, point GAPS_DB_FILE at it and restart. Keep the original until validation is complete.
6. Record the recovery and conduct production-like restore drills. Changes after the snapshot are not reconstructed.

## Weekly Reporting and Operations

Scheduled and manual emailed weekly reports are disabled because no email provider is used. Staff can still filter dates and download CSV/Excel reports on demand from Reports. Existing weekly settings and historical maintenance records are preserved, but do not enable email delivery.

Apply client retention to applications, profiles, notes, audit, notifications/attachments and backups. No automatic purge is implemented without approved policy. Restrict handling/forwarding of exported personal information.

Before launch: approval of the password-only/no-email scope change; live staff/applicant access and Salesforce tests; approved legal/content/branding/field policy; HTTPS/proxy/storage encryption/ACL verification; protected offsite backup and restore drill; retention/support owner; manual keyboard/screen-reader/WCAG review; production-like load and penetration testing; signed client UAT.

Local 5,000-record timing is not deployed concurrency/capacity certification. Larger horizontal deployments need a server database, server-side pagination and external queue/scheduler.

References: [Node.js online SQLite backup](https://nodejs.org/api/sqlite.html), [node-cron scheduling](https://www.nodecron.com/scheduling-options.html), [ExcelJS](https://github.com/exceljs/exceljs), [Helmet](https://github.com/helmetjs/helmet).
