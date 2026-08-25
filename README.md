# GAP Applicant Portal

## Product Overview

GAP Applicant Portal is a responsive web application for people who want to foster or adopt a greyhound. Applicants can create an account, sign in, view their profile, complete an application, save unfinished work as a draft, submit the completed form, and view the latest application status.

The product is self-contained and runs entirely in the browser. Its asynchronous data services simulate authentication and application APIs while storing product data in browser `localStorage`.

## Architecture

### Technology stack

- React 19
- TypeScript
- React Router
- Vite
- Vitest
- ESLint

### Project structure

```text
src/
  app/                 Application routes and root layout
  components/          Shared interface components
  features/
    auth/               Registration, login, session and simulated auth API
    applicant/          Dashboard, form and simulated application API
  pages/                General pages
  routes/               Protected-route handling
  styles/               Global responsive styles
```

The interface, validation and data-access layers are separated by feature. Page components call typed asynchronous service interfaces, while the simulated API implementations manage users, sessions and applications in `localStorage`. Protected routing prevents unauthenticated access to applicant pages.

## Getting Started

### Prerequisites

- Node.js 24 or later
- npm

### Install and start

```bash
npm install
npm run dev
```

Open the local address displayed in the terminal, normally:

```text
http://localhost:5173
```

## Authentication API

The project now includes a local Node.js/Express authentication API backed by
SQLite. It supports applicant account registration, login, JWT authentication,
logout, current-user lookup, role middleware and basic audit logging.

### API setup

Create a local environment file:

```bash
copy .env.example .env
```

Then set a long random value for `JWT_SECRET`.

Initialise the SQLite database:

```bash
npm run api:init-db
```

Start the API:

```bash
npm run api
```

The API normally runs at:

```text
http://localhost:4000
```

### Auth endpoints

```text
GET  /api/health
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout
```

Register request body:

```json
{
  "fullName": "Taylor Applicant",
  "email": "taylor@example.com",
  "password": "safe-password"
}
```

Login returns a JWT. Send it to protected routes using:

```text
Authorization: Bearer <token>
```

Protected-route middleware is available for future sprint work:

```text
requireAuth
requireRole(...)
requireApplicant
requireStaff
```

### Optional commands

```bash
npm run check
npm run build
npm run preview
npm run api:test
```

- `npm run check` runs linting, TypeScript checking, unit tests and a production build.
- `npm run build` creates the production files in `dist/`.
- `npm run preview` previews the production build locally.
