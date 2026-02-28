# SahaCare v0

Landing site + waitlist backend for interview-phase validation.

## What is included

- Public landing pages (`index.html`, `how-it-works.html`)
- Waitlist API with centralized lead storage
- Mandatory user confirmation email on signup
- Founder notification email on new signup
- Visit tracking endpoint for basic traffic observability
- Admin ops endpoints + founder admin page (`admin.html`)
- CSV export for waitlist leads
- Basic CI checks for deploy safety

## Stack

- Frontend: static HTML/CSS/JS
- Backend: Vercel serverless functions (`/api/*.js`)
- Database: Supabase Postgres (via REST API)
- Email: Resend API

## API endpoints

- `POST /api/waitlist`
  - body: `{ "email": "...", "role": "adult-child-caregiver|parent-elder-user" }`
- `POST /api/track-visit`
  - body: `{ "path": "/" }`
- `GET /api/metrics`
  - returns `{ totalLeads, totalVisits }`
- `GET /api/admin/leads` (requires header `x-admin-key`)
- `PATCH /api/admin/leads` (requires header `x-admin-key`)
  - body: `{ "id": "<uuid>", "status": "new|contacted|interviewed|pilot_candidate" }`
- `GET /api/admin/export` (requires header `x-admin-key`)

## Setup

1. Create a Supabase project.
2. Run SQL from [`db/schema.sql`](/Users/akashmetawala/Documents/Projects/AI/CodexPlayground/db/schema.sql).
3. Create a Resend account and verified sender domain.
4. Set env vars in Vercel from [`.env.example`](/Users/akashmetawala/Documents/Projects/AI/CodexPlayground/.env.example):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_ANON_KEY`
   - `RESEND_API_KEY`
   - `EMAIL_FROM`
   - `FOUNDER_EMAIL`
   - `ADMIN_API_KEY`
5. Deploy to Vercel.
6. Open `/admin.html`, enter `ADMIN_API_KEY`, manage leads.

## Local checks

```bash
npm run check:files
npm run check:syntax
```

## Notes

- Waitlist submission now goes to backend (not localStorage).
- User confirmation email is mandatory and sent on every successful signup.
- `v0.5` items (spam protection + legal pages) can be added next.
