# AI Assistant SaaS MVP

A full-stack MVP SaaS app that automates recurring SMB workflows:

- AI-powered customer email responses
- Employee onboarding tasks/forms/e-signature stub
- Invoice parsing with preview-before-save
- Meeting scheduling with Google Calendar stub/integration
- Admin controls for AI model and auto-reply behavior
- Automation run history and email draft management

## Stack

- **Frontend:** React + Vite (`/frontend`)
- **Backend:** Node.js + Express (`/backend`)
- **Data:** PostgreSQL (`pg`) with in-memory fallback (when `DATABASE_URL` is unset)
- **Integrations:** OpenAI API + Google Calendar API (safe stubs if credentials missing)

## Setup

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment

Create `backend/.env` from `backend/.env.example`.

Important env vars:

- `PORT` (default `4000`)
- `DATABASE_URL` (optional for in-memory mode)
- `JWT_SECRET` (**required outside development**)
- `OPENAI_API_KEY` (optional; fallback text is used if missing)
- Google API vars (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GOOGLE_REFRESH_TOKEN`)

JWT behavior:

- `NODE_ENV=development` + missing `JWT_SECRET` => server starts with a loud warning + dev-only fallback secret.
- non-development + missing `JWT_SECRET` => server exits with an error.

### 3) Run locally

```bash
npm run dev
npm run frontend
```

- Backend: `http://localhost:4000`
- Frontend: `http://localhost:5173`

## Docker Compose

Run end-to-end (frontend + backend + postgres):

```bash
docker compose up --build
```

## Admin bootstrap in development

Use seed data to create a safe local admin user:

```bash
npm run seed --workspace backend
```

Default seeded admin credentials:

- Email: `admin@example.com`
- Password: `AdminPass123!`

> For production, replace seeded credentials and use secure user provisioning.

## API Routes

### Health
- `GET /api/health`

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/google` (stub-style OAuth login input)

### Email Automation
- `POST /api/email/respond`
  - Enforces `autoReplyEnabled`; returns `403` when disabled.

### Automation History
- `GET /api/automations` (last 25 runs)

### Drafts (Email response drafts)
- `POST /api/drafts`
- `GET /api/drafts`
- `GET /api/drafts/:id`
- `PUT /api/drafts/:id`
- `DELETE /api/drafts/:id`

### Onboarding
- `GET /api/onboarding/tasks`
- `POST /api/onboarding/tasks`
- `PATCH /api/onboarding/tasks/:id`
- `POST /api/onboarding/forms`
- `POST /api/onboarding/esignature`

### Invoices
- `POST /api/invoices/preview` (parse only, no save)
- `POST /api/invoices` (save parsed invoice)
- `POST /api/invoices/upload` (upload + parse + save)
- `GET /api/invoices`

Upload hardening:

- Requires file for upload endpoint
- Rejects files over 2MB (`413`)
- Validates file buffer and empty-file cases

### Meetings
- `POST /api/schedule/meetings`
- `GET /api/meetings`

### Admin
- `GET /api/admin/dashboard`
- `GET /api/admin/users`
- `GET /api/admin/settings`
- `PUT /api/admin/settings`

## Frontend UX

The app includes a tabbed UI with:

- Login/Register
- Dashboard (metrics + latest automations)
- Email Responder (generate + draft CRUD)
- Invoices (text/file preview + save + list)
- Meetings (validation + schedule + list)
- Automation Runs
- Admin Settings (guarded for admin role)

A shared API client handles:

- token storage and `Authorization: Bearer ...`
- consistent JSON error handling
- reusable endpoint wrappers

## Validation

Backend tests:

```bash
npm test
```

Frontend quality checks:

```bash
npm run lint --workspace frontend
npm run build --workspace frontend
```

## Key design notes

- API response shapes are normalized to camelCase across DB and in-memory storage.
- Sensitive password hashes are never exposed in list/admin API responses.
- OpenAI/Google integrations are optional for local development and fail safely.

## TODO

- Replace Google OAuth stub flow with full auth-code exchange and secure token storage.
- Add organization/tenant isolation + RBAC beyond single-role MVP.
- Add background jobs for async automation retries and long-running ingestion.
- Extend observability/auditing and granular per-route rate-limit policies.
