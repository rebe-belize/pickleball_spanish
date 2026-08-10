create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists responses (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  comment text,
  created_at timestamptz not null default now(),
  unique(event_id, player_id)
);

create index if not exists events_starts_at_idx on events(starts_at);
create index if not exists responses_event_id_idx on responses(event_id);

alter table players enable row level security;
alter table events enable row level security;
alter table responses enable row level security;

create policy "public can read active players"
on players for select
to anon, authenticated
using (active = true);

create policy "public can read active events"
on events for select
to anon, authenticated
using (active = true);

create policy "public can read responses"
on responses for select
to anon, authenticated
using (true);

create policy "public can insert responses"
on responses for insert
to anon, authenticated
with check (true);

create policy "public can update responses"
on responses for update
to anon, authenticated
using (true)
with check (true);

-- Admin writes are performed by the server with the service role key.
-- Add this server-only variable in Vercel:
-- SUPABASE_SERVICE_ROLE_KEY=...
