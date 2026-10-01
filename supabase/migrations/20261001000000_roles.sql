-- User roles: every Supabase Auth user gets a profile row with one of three
-- roles. Couples own their event through events.user_id.
--
-- Like the rest of the schema, these tables are only accessed through the
-- Next.js API routes with the secret key, so RLS is enabled with no policies.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'couple'
    check (role in ('admin', 'staff', 'couple')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Nullable so existing events (created before accounts existed) stay valid.
-- Deleting the couple's account keeps the event but detaches it.
alter table public.events
  add column user_id uuid references auth.users (id) on delete set null;

create index events_user_id_idx on public.events (user_id);

-- To make an existing Auth user an admin, run (with their email):
--
--   insert into public.profiles (id, role)
--   select id, 'admin' from auth.users where email = 'you@example.com'
--   on conflict (id) do update set role = excluded.role;
