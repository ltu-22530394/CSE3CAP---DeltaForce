# Greyhounds as Pets Foster Portal

The React portal now uses the Node/Express API and SQLite database for shared applicant, staff and greyhound records. Changes persist across browser sessions and are visible to other authorised users. Browser service factories remain for the original unit tests; existing localStorage demo records are retained but are not automatically migrated into the database.

## Run Locally

Use Node.js 24 or later. Run `npm install`, then `npm run dev`. This starts both the API (port 4000) and Vite (normally port 5173). Open `http://localhost:5173/` and choose Applicant or Staff. Applicant access starts at `/applicant/login`, with links to apply or register; staff access starts at `/staff/login`. Existing `/apply` and `/login` links still work. Pages scroll vertically when content exceeds the screen height, and wide lists/reports scroll horizontally within their own regions. If Vite uses another port, update `APP_ORIGIN` in `.env`. Set `API_PROXY_TARGET` when the API runs on another port.

The development administrator account is `jamie@gap.example`, password `Greyhound2026!`. Its password access is disabled in production. Set `DEMO_STAFF_ENABLED=false` to disable it locally.

Configuration is documented in `.env.example`. An optional `.env` is read by the backend and Vite. Keep secrets in that file or the deployment environment. Public contacts and legal notices are edited through administrator settings; never expose provider credentials through `VITE_` variables.

## Connected Workflows

- The public foster form validates required details, creates the application and account together, queues confirmation and verification emails, and returns an application ID.
- Applicants verify their email before login. Password reset links expire, are single-use, and revoke existing sessions after a password change.
- Drafts, submission, status, information requests and responses use the shared database. Submitted answers remain protected.
- Staff review applications and choose whether to share a decision note. Information requests are applicant-visible; other notes are private by default.
- Approval updates the account role and unlocks client-supplied care resources. Administrators can add, edit or hide HTTPS video/document links under Integrations & Resources.
- Staff preview and confirm CSV imports. Invalid rows, duplicates, missing columns, summaries and downloadable error reports are supported. Existing records are skipped unless updating matching records is selected.
- Available greyhounds can be allocated to approved applications. Transactions and a database constraint prevent overlapping active allocations. Ending a placement releases the greyhound and retains its history.
- Carers see their own allocated greyhound and relevant care instructions. Ownership and staff access are checked on the backend.
- CSV application status reports support backend date/status/location/staff/allocation filters and audited exports. Cells are escaped against spreadsheet formula execution.
- Authentication, decisions, submissions, imports, allocations, resources and exports are audited. Sessions expire after 30 minutes of inactivity and can be revoked at logout.

## External Services

### Email

The default `EMAIL_MODE=preview` stores local previews. It sends no email and never marks a preview sent. After public application or registration, development-only verification links let the capstone be demonstrated. Staff can inspect queued previews under Integrations & Resources.

For delivery, set `EMAIL_MODE=smtp` and the SMTP host, port, sender and credentials. Use `SMTP_SECURE=true` for implicit TLS (typically port 465), or false for STARTTLS (typically 587). Production requires encrypted SMTP. Acceptance is recorded as sent; failures are recorded and can be retried. SMTP acceptance does not confirm recipient inbox delivery.

### Microsoft Staff Sign-In

Register a single-tenant Web application in the client's Microsoft Entra tenant. Register the `MICROSOFT_REDIRECT_URI` exactly, and supply its tenant ID, client ID and secret value.

Set authorised staff object IDs in `MICROSOFT_STAFF_OBJECT_IDS`, separated by commas. Administrator object IDs also go in `MICROSOFT_ADMIN_OBJECT_IDS` and must appear in the staff allowlist. Matching an applicant email never silently promotes or links an account.

OpenID Connect authorization code flow uses PKCE, nonce, browser-bound state and signed ID token validation. Tenant and audience are checked. A one-time local code is exchanged rather than exposing a session token in a redirect URL. Microsoft tenant policies enforce MFA. SAML is not implemented; the requirements also permit another approved Microsoft identity service.

### Salesforce

CSV exports work without Salesforce credentials. See `samples/greyhounds.csv`. Required columns are `id,name,sex` and `age` or `dateOfBirth`. CSV and genuine plain-data XLSX are supported. Optional columns include Salesforce/registration IDs, colour, location, full status, compatibility, special requirements, feeding/photo links and appropriate care/medical/behaviour notes. Age is a whole number from 0 to 20; sex is Male, Female or Unknown. Upload limits are 1 MB and 5,000 records.

For optional direct reads, configure an approved Salesforce integration application with OAuth client credentials and a suitable run-as integration user. Supply the HTTPS My Domain URL, credentials, greyhound object API name, API version and JSON field mapping. The id/name/age/sex mappings are required. The client must provide the actual object and field names.

Preview retrieves up to 5,000 records, follows pagination and preserves Salesforce IDs. Confirmation uses the same validated import rules. The connector never writes to Salesforce.

## Verification

`npm run check` runs lint, TypeScript, frontend unit tests, backend integration tests and the frontend production build.

`npm run test:e2e` runs the browser workflow using installed Chrome, isolated API/Vite ports 4011/5174 and a separate database. Screenshots and traces appear in `test-results`.

Provider tests use a local SMTP fixture and mocked Salesforce/Microsoft responses. Client tenant, mailbox and Salesforce connections require live verification once configured.

## Client Deployment

Provide approved privacy/terms text, final form fields, care links, foster-visible greyhound fields, email wording, hosting, retention and backup policies. Configure HTTPS, a random JWT secret, production SMTP and Microsoft staff access. Route `/api` to the backend and frontend routes to the SPA entry point. `npm run build` builds the frontend; `npm run start:api` starts the backend.

Production refuses weak/unset JWT secrets, HTTP origins or preview email mode. CSV/XLSX imports, weekly report scheduling, editable email templates, account administration, public content settings, audit viewer, daily verified backups and safe restoration are implemented. Live client services, legal/content approval, encrypted hosting, manual accessibility/security review and formal client acceptance remain required.

Provider references: [openid-client](https://github.com/panva/openid-client), [Nodemailer SMTP](https://nodemailer.com/smtp), [Salesforce client credentials](https://developer.salesforce.com/blogs/2024/02/invoke-rest-apis-with-the-salesforce-integration-user-and-oauth-client-credentials).

## Completed Requirement Extensions

Selected applicant contact editing, one-time staff-permitted form correction, private/shared case notes, assigned staff and full application filters; withdrawn/inactive workflows; all greyhound metadata/status/compatibility filters; expected/actual placement dates, private notes and history; paginated complete status reports with CSV/Excel exports; weekly durable report attachments; administrator accounts/roles/disable, templates/settings/audit/maintenance; public/restricted resources; online daily backups and a non-overwriting restore CLI.

## Capstone Documentation

- [Client requirements](docs/client-requirements.md)
- [183-requirement traceability and remaining client decisions](docs/requirements-matrix.md)
- [Architecture, context/use-case/ER diagrams and wireframes](docs/capstone-design.md)
- [User stories and prioritized backlog](docs/user-stories-and-backlog.md)
- [User guide and demonstration script](docs/user-guide.md)
- [Deployment, security and recovery](docs/deployment.md)
- [Test plan and evidence](docs/test-plan.md)
