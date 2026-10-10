# Greyhounds as Pets Foster Management System

**Developed by the DeltaForce Group | CSE3CAP Capstone Project**

The Greyhounds as Pets Foster Management System helps GAP manage foster applications, greyhound records, and foster placements in one place.

Applicants can submit applications and track their progress. Staff can review applications, manage greyhounds, and coordinate placements. The website supports desktop, tablet, and mobile use.

## Main Features

- **Applicant portal:** Registration, email/password login, administrator-assisted password recovery, foster applications, status tracking, and profile updates.
- **Staff dashboard:** Application activity, reviews, greyhound management, foster assignments, and reports.
- **Administrator tools:** Account management, notification templates, resources, system settings, audit logs, and backups.
- **Data management:** CSV and Excel imports, validation, import history, and downloadable reports.
- **Connected workflows:** Application decisions, placements, greyhound availability, and notifications share the same backend data.

## Using the Website

### Applicants
1. Select **Applicant** on the home page.
2. Sign in or select **Apply to become a foster carer**.
3. Complete the application and choose a password. No verification email is needed.
4. Sign in to track your application and respond to requests for information.
5. Once approved, access approved-carer resources. Assigned greyhound details appear after staff arrange a placement.

Signed-in applicants can save application drafts. Staff can permit corrections to submitted applications when necessary.

### Staff
1. Select **Staff** on the home page and sign in with an authorised email and password.
2. Review applications, record notes, request information, and make approval decisions.
3. Add or update greyhound records, or import records from CSV or Excel.
4. Assign available greyhounds to approved applicants and manage their placements.
5. View reports and export records when required.

Selecting **Staff** does not grant staff permissions. Access must be authorised.

### Administrators
Administrators create private staff accounts, reset passwords, and manage settings, resources, audit records and backups through the staff portal. Public registration creates applicant accounts only.

## Tools Used

- **Frontend:** React, TypeScript, Vite, React Router, CSS, and Lucide icons.
- **Backend:** Node.js, Express, and SQLite.
- **Data integration:** CSV/Excel import and an optional Salesforce connector. Microsoft SSO and external email delivery are not used in this version.
- **Testing:** Vitest, Node.js tests, Playwright, accessibility checks, ESLint, and TypeScript checks.
- **Collaboration and hosting:** Git, GitHub, and planned deployment through Render.

## Development Journey

DeltaForce developed the project around the client requirements, connecting the applicant and staff interfaces with backend workflows, greyhound management, imports, placements, account security, and reporting. Responsive layouts and automated testing support the user experience. Production configuration, live-service testing, and Render deployment are the next stage.

## Running the Project Locally

1. Install **Node.js 24**, which includes npm.
2. Download the project from its GitHub repository using **Code > Download ZIP**, then extract it.
3. Open the extracted project folder in **Visual Studio Code**. Use the folder containing `package.json`.
4. Select **Terminal > New Terminal** and run:

```bash
npm ci
npm run dev
```

Open **http://localhost:5173** in your browser. If the terminal shows a different address, use that address instead. The command starts both the frontend and backend. Keep the terminal open while using the website; press **Ctrl+C** to stop it.

### Local Staff Login

For a local demonstration, select **Staff** and use:

- **Email:** `jamie@gap.example`
- **Password:** `Greyhound2026!`

This demonstration account is disabled in production.

Applicants can register and sign in immediately. Forgotten passwords are handled by an administrator after identity checks, not by email. Business notification history is stored in the portal; no verification, approval, allocation or weekly-report emails are sent. Configuration options are listed in [`.env.example`](.env.example). Never commit credentials or your `.env` file.

## Testing

Run `npm run check` for linting, type checks, unit tests, backend tests, and a production build. Run `npm run test:e2e` separately for browser tests; Google Chrome is required. Current results and pre-existing legacy backend test failures are recorded in the [Test Plan](docs/test-plan.md).

## Deployment on Render

Deployment is planned through **Render**. Render Free can run a demonstration, but its local SQLite database and backups are lost on restart, redeployment or idle spin-down. Use synthetic data only. Reliable client storage requires a paid service with a persistent disk or a separately hosted database.

1. Connect the project repository to Render and create a **Node Web Service** using the repository root.
2. Set the **Build Command** to `npm ci --include=dev && npm run build`.
3. Set the **Start Command** to `npm run start:api` and the **Health Check Path** to `/api/health`.
4. For a free demonstration, set `GAPS_DB_FILE=server/data/gaps.sqlite` and `BACKUP_DIR=server/backups`. For a paid persistent disk mounted at `/var/data`, use paths under `/var/data` instead.
5. Set `NODE_ENV=production`, `NODE_VERSION=24`, your actual HTTPS `APP_ORIGIN`, a generated random `JWT_SECRET` of at least 32 characters, `DEMO_STAFF_ENABLED=false` and the correct `TRUST_PROXY_HOPS` (normally `1` behind Render's proxy; verify after deployment). Let Render supply `PORT`; leave `API_PORT` unset.
6. Privately set `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_NAME` and `BOOTSTRAP_ADMIN_PASSWORD` in Render. Choose a unique password of at least 16 characters and at most 72 UTF-8 bytes. These create the first administrator; sign in through **Staff** and use **Administration > Accounts** to create other staff accounts. Do not register the administrator through the public signup page.
7. Remove obsolete `SMTP_*`, `EMAIL_*` and `MICROSOFT_*` settings. They are not required. Save and redeploy the updated GitHub code. Configure Salesforce only when approved credentials and mappings are available.

Bootstrap does not overwrite existing passwords, promote applicants or reactivate disabled administrators. For an existing active Microsoft-only administrator, set the bootstrap email to that exact account to initialise its first password. Keep bootstrap credentials protected; a fresh free-service database needs them again. Full details are in the deployment guide.

This demo login choice replaces the client's original Microsoft SSO and email requirements. Obtain client approval before using it for handover.

The backend serves both the website and API. Use one service instance for the current SQLite design. External connectors are implemented, but live connections require configuration and testing before launch. See the [Deployment Guide](docs/deployment.md) for full settings, security checks, and backup procedures.

## Project Documentation

- [User Guide](docs/user-guide.md)
- [Client Requirements](docs/client-requirements.md)
- [System Design](docs/capstone-design.md)
- [Test Plan](docs/test-plan.md)
- [Sample Greyhound CSV](samples/greyhounds.csv)
