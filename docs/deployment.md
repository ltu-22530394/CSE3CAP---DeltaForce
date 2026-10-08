# Deployment and Recovery

This proof of concept needs client approval and security review before real personal information is used.

## Setup

Use Node.js 24+. Run npm ci, npm run check and npm run build. Local npm run dev starts API/Vite. Production npm run start:api serves the API and built SPA from dist. Run one API process against a protected persistent SQLite volume.

Configure from .env.example; never commit secrets or expose them through VITE_ variables. Production requires NODE_ENV=production, random JWT_SECRET of at least 32 characters, exact HTTPS APP_ORIGIN and real SMTP with EMAIL_MODE=smtp. Configure client Microsoft credentials, exact callback and authorized identities. Demo password login is disabled in production.

Use an HTTPS reverse proxy. TRUST_PROXY_HOPS must match the trusted topology; use 1 only for one trusted proxy. Forward X-Forwarded-Proto and restrict direct backend access. Production rejects insecure requests except health. Verify actual TLS, headers, CSP, origin and redirects after deployment.

Put GAPS_DB_FILE and BACKUP_DIR outside publicly served directories on access-restricted encrypted persistent storage. Protect database/WAL/SHM, backups, report attachments and audit. File mode flags alone are not Windows ACLs or encryption; configure host permissions explicitly. Never store backups in dist.

## Providers

Microsoft: register a single-tenant Web application, exact redirect and protected secret. Bootstrap approved staff/admin object allowlists or provision identities via Accounts. Existing stored roles/disabled status are authoritative. Enforce and test MFA with client Entra policy. Do not link applicant accounts by email.

SMTP: approved sender, encrypted SMTP or STARTTLS, protected credentials and mailbox acceptance tests. Preview sends nothing. Sent records SMTP acceptance, not inbox delivery. The minute maintenance job retries pending/failed mail. Duplicate delivery remains possible after provider acceptance followed by a database failure.

Salesforce: validate real exports first. Optional read-only OAuth connector needs approved integration/run-as permissions, HTTPS My Domain, object/API version and actual field mapping. Preview/confirm is manual. No scheduled sync/write-back exists.

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

Enable reporting and choose active staff in Administration. Monday 09:00 local time queues the last seven inclusive local calendar dates with a durable CSV attachment. Manual queueing is once per local date; changing recipients does not resend that date. Observe outbox delivery, not just maintenance queued status.

Apply client retention to applications, profiles, notes, audit, notifications/attachments and backups. No automatic purge is implemented without approved policy. Restrict handling/forwarding of exported personal information.

Before launch: live Microsoft/MFA/SMTP/Salesforce tests; approved legal/content/branding/field policy; HTTPS/proxy/storage encryption/ACL verification; protected offsite backup and restore drill; retention/support owner; manual keyboard/screen-reader/WCAG review; production-like load and penetration testing; signed client UAT.

Local 5,000-record timing is not deployed concurrency/capacity certification. Larger horizontal deployments need a server database, server-side pagination and external queue/scheduler.

References: [Node.js online SQLite backup](https://nodejs.org/api/sqlite.html), [node-cron scheduling](https://www.nodecron.com/scheduling-options.html), [ExcelJS](https://github.com/exceljs/exceljs), [Helmet](https://github.com/helmetjs/helmet), [openid-client](https://github.com/panva/openid-client), [Nodemailer SMTP](https://nodemailer.com/smtp).
