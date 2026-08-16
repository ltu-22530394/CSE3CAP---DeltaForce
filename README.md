# GAP Applicant Portal



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
    auth/               Registration, login and session management
    applicant/          Dashboard and application workflow
  pages/                General pages
  routes/               Protected-route handling
  styles/               Global responsive styles
```

The interface is separated from authentication and application data services. By default, these services use browser `localStorage`. They can be switched to HTTP endpoints through environment variables without changing the page components.

## Getting Started

### Requirements

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

### Optional commands

```bash
npm run check
npm run build
npm run preview
```

- `npm run check` runs linting, TypeScript checking, unit tests and a production build.
- `npm run build` creates the production files in `dist/`.
- `npm run preview` previews the production build locally.

### Connect a backend API

Copy `.env.example` to `.env`, enter the API base URL and set:

```env
VITE_USE_MOCK_API=false
```
