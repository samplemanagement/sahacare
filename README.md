# SahaCare v0.5

Landing site + waitlist backend for interview-phase validation.

## Included

- Public pages: `index.html`, `how-it-works.html`
- Legal pages: `privacy.html`, `terms.html`
- Waitlist API with centralized lead storage
- Mandatory user confirmation email on signup
- Founder notification email on new signup
- Visit tracking endpoint for basic observability
- Admin ops page (`admin.html`) + CSV export
- Spam protection: honeypot + DB-backed rate limit
- Security headers via `vercel.json`

## Stack

- Frontend: static HTML/CSS/JS
- Backend: Vercel serverless functions (`/api/*.js`)
- Database: Supabase Postgres (via REST API)
- Email: Resend API

## API endpoints

- `POST /api/waitlist`
  - body: `{ "email": "...", "role": "adult-child-caregiver|parent-elder-user", "company": "" }`
- `POST /api/track-visit`
- `GET /api/metrics`
- `GET /api/admin/leads` (header `x-admin-key`)
- `PATCH /api/admin/leads` (header `x-admin-key`)
- `GET /api/admin/export` (header `x-admin-key`)

## Setup

1. Create a Supabase project.
2. Run SQL from [`db/schema.sql`](/Users/akashmetawala/Documents/Projects/AI/CodexPlayground/db/schema.sql).
3. In Resend, verify your sending domain (for real recipient delivery).
4. Set environment variables in Vercel from [`.env.example`](/Users/akashmetawala/Documents/Projects/AI/CodexPlayground/.env.example).
5. Deploy to Vercel.
6. Open `/admin.html`, enter `ADMIN_API_KEY`, and manage leads.

## If upgrading from v0 to v0.5

- Re-run [`db/schema.sql`](/Users/akashmetawala/Documents/Projects/AI/CodexPlayground/db/schema.sql) to create `waitlist_attempts`.
- Add new env var: `WAITLIST_MAX_ATTEMPTS_PER_HOUR` (recommended: `8`).
- Redeploy.

## Local checks

```bash
npm run check:files
npm run check:syntax
```
