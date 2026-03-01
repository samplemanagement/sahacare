create extension if not exists pgcrypto;

create table if not exists waitlist_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role text not null,
  status text not null default 'new' check (status in ('new', 'contacted', 'interviewed', 'pilot_candidate')),
  source text,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_waitlist_leads_created_at on waitlist_leads(created_at desc);
create index if not exists idx_waitlist_leads_status on waitlist_leads(status);

create table if not exists site_visits (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  referrer text,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_site_visits_created_at on site_visits(created_at desc);

create table if not exists event_logs (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  route text not null,
  status_code int not null,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_event_logs_created_at on event_logs(created_at desc);
create index if not exists idx_event_logs_event_type on event_logs(event_type);

create table if not exists waitlist_attempts (
  id uuid primary key default gen_random_uuid(),
  email text,
  ip_address text,
  accepted boolean not null default false,
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_waitlist_attempts_email_created_at on waitlist_attempts(email, created_at desc);
create index if not exists idx_waitlist_attempts_ip_created_at on waitlist_attempts(ip_address, created_at desc);
