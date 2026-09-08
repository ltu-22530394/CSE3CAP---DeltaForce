# Greyhound Adoption Program Portal

The GAP Portal supports the complete greyhound adoption and fostering journey for applicants and staff.

## Applicant experience

Applicants can:

- create an account and log in;
- start an adoption or foster application;
- complete personal, home environment and pet experience details;
- save a draft and continue it later;
- review and submit an application; and
- view the current application status and staff feedback.

Submitted applications are read-only. Previous applications remain available from the applicant dashboard.

## Staff experience

Staff can:

- view application workload and review progress;
- open recently submitted applications;
- search, filter, sort and page through applications;
- review applicant, contact, household and pet experience details;
- move between applications without losing the current list filters;
- approve or reject an application;
- request additional information; and
- review the full application activity history.

Applicant submissions appear in the staff application queue. Staff status changes and review notes appear in the applicant portal. Draft applications remain private to the applicant.

## Access

Applicants register from the public Create Account page and then log in with their own credentials.

Staff use the shared Login page with the local staff account:

- Email: `jamie@gap.example`
- Password: `Greyhound2026!`

Each account is routed to the appropriate portal, and protected routes prevent access to the other role’s workspace.

## Local data

By default, the portal uses asynchronous browser-based data services backed by `localStorage`. Account sessions, drafts, submitted applications, review decisions and activity history remain available in the same browser and origin. Set `VITE_API_URL` to use the authenticated Express/SQLite staff integration instead.

## Project structure

- `src/App.tsx` — portal routes and role-based access.
- `src/applicant/features/auth` — registration, login and applicant sessions.
- `src/applicant/features/applicant` — applicant dashboard, application form, validation and application data service.
- `src/api` — staff data service, application decisions and dashboard calculations.
- `src/pages` — staff dashboard, application list, review and profile pages.
- `src/components` — staff navigation, application rows, dialogs and feedback.
- `src/styles/index.css` — staff portal styles.
- `src/applicant/styles.css` — applicant and authentication styles.

## Run locally

Use Node.js 24 or later.

```bash
npm install
npm run dev
```

Open the address shown in the terminal.

### Run with the integrated API (DEL-54 and DEL-55)

Copy `.env.example` to `.env`, set a strong `JWT_SECRET` and `STAFF_PASSWORD`, then run:

```bash
npm install
npm run init:db
npm run seed:staff
npm run start:api
```

In a second terminal, run `npm run dev`. When `VITE_API_URL` is set, the existing staff screens use the authenticated Express/SQLite API. Without it, the original local-storage demo remains available.

Staff endpoints are available under `/api/staff`: application list/detail/decision, available greyhounds, and greyhound allocations. Staff and admin roles are required.

## Validate and build

```bash
npm run check
```

The production output is generated in `dist`. Static hosting must route application paths back to `index.html`.
