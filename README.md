# AI Assistant SaaS MVP

This repository contains an MVP SaaS application that automates common SMB operations:

- AI-powered customer email response generation (OpenAI)
- Employee onboarding checklist/forms/e-signature stub
- Invoice upload + parsing + persistence
- Meeting scheduling with Google Calendar integration (or stub fallback)
- Admin dashboard for users, automation metrics, and AI settings

## Architecture

- **Frontend**: React + Vite (`/frontend`)
- **Backend API**: Node.js + Express (`/backend`)
- **Database**: PostgreSQL (`pg` adapter, with in-memory fallback for local tests)
- **Integrations**:
  - OpenAI API (`/api/email/respond`)
  - Google Calendar API (`/api/schedule/meetings`)

## Quick Start

### Local development

```bash
npm install
npm run dev        # backend on :4000
npm run frontend   # frontend on :5173
```

Seed demo data:

```bash
npm run seed --workspace backend
```

### Docker development

```bash
docker compose up --build
```

## API Routes (MVP)

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/google`

### AI Email Automation
- `POST /api/email/respond`

### Onboarding
- `GET /api/onboarding/tasks`
- `POST /api/onboarding/tasks`
- `PATCH /api/onboarding/tasks/:id`
- `POST /api/onboarding/forms`
- `POST /api/onboarding/esignature`

### Invoice Tracking
- `POST /api/invoices/upload`
- `GET /api/invoices`

### Scheduling
- `POST /api/schedule/meetings`

### Admin
- `GET /api/admin/dashboard`
- `GET /api/admin/users`
- `GET /api/admin/settings`
- `PUT /api/admin/settings`

## Testing

```bash
npm test
```

Includes unit/integration tests for invoice parsing and key API behavior.

## Design Decisions

- Chosen a single Node.js stack for fast MVP delivery and easy deployment.
- Added in-memory fallback when `DATABASE_URL` is absent to keep tests deterministic.
- Kept Google/OpenAI integrations production-ready but provided safe fallback behavior when keys are not configured.

## TODO

- Replace Google OAuth stub with full OAuth authorization code flow.
- Add per-tenant organizations and RBAC.
- Add richer invoice OCR parser and document storage.
- Add production-grade auditing, rate limiting, and background job workers.
