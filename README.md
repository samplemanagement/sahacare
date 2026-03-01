# SahaCare v0.6

Landing site + waitlist backend for interview-phase validation.

## Included

- Public pages: `index.html`, `how-it-works.html`
- Legal pages: `privacy.html`, `terms.html`
- Waitlist API with centralized lead storage
- Mandatory user confirmation email on signup
- Founder notification email on new signup
- Visit tracking endpoint for basic observability
- Health endpoint for backend checks: `/api/health`
- Admin ops page (`admin.html`) + CSV export
- Spam protection: honeypot + Turnstile + DB-backed rate limit
- Security headers via `vercel.json`

## Stack

- Frontend: static HTML/CSS/JS
- Backend: Vercel serverless functions (`/api/*.js`)
- Database: Supabase Postgres (via REST API)
- Email: Resend API
- Bot protection: Cloudflare Turnstile

## API endpoints

- `POST /api/waitlist`
  - body: `{ "email": "...", "role": "adult-child-caregiver|parent-elder-user", "company": "", "turnstileToken": "..." }`
- `POST /api/track-visit`
- `GET /api/public-config`
- `GET /api/metrics`
- `GET /api/health`
- `POST /api/admin/login`
- `POST /api/admin/logout`
- `GET /api/admin/session`
- `GET /api/admin/leads` (cookie-auth)
- `PATCH /api/admin/leads` (cookie-auth)
- `GET /api/admin/export` (cookie-auth)

## Setup

1. Create a Supabase project.
2. Run SQL from [`db/schema.sql`](/Users/akashmetawala/Documents/Projects/AI/CodexPlayground/db/schema.sql).
3. In Resend, verify your sending domain.
4. In Cloudflare Turnstile, create a site and copy `site key` and `secret key`.
5. Set environment variables in Vercel from [`.env.example`](/Users/akashmetawala/Documents/Projects/AI/CodexPlayground/.env.example).
6. Deploy to Vercel.
7. Open `/admin.html`, authenticate once with `ADMIN_API_KEY`, and manage leads.

## If upgrading from v0/v0.5

- Re-run [`db/schema.sql`](/Users/akashmetawala/Documents/Projects/AI/CodexPlayground/db/schema.sql) to ensure `waitlist_attempts` exists.
- Add new env vars:
  - `ADMIN_SESSION_SECRET` (recommended)
  - `TURNSTILE_SITE_KEY`
  - `TURNSTILE_SECRET_KEY`
- Redeploy.

## Local checks

```bash
npm run check:files
npm run check:syntax
```
