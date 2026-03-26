create table public.page_visits (
  id uuid primary key default gen_random_uuid(),
  page text not null,
  timestamp timestamptz not null,
  session_id text not null,
  referrer text,
  is_return_visit boolean default false,
  device_type text,
  screen_width integer,
  duration_ms integer,
  scroll_depth_pct integer,
  created_at timestamptz default now()
);

alter table public.page_visits enable row level security;