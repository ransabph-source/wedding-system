-- Sales leads for the admin CRM.
--
-- The app reads and writes leads through the admin-only /api/admin/leads
-- routes with the secret key, which bypasses RLS. The policy below is a second
-- line of defence: with the public key, only a signed-in admin can touch leads.

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  names text not null check (length(trim(names)) > 0),
  phone text not null default '',
  event_type text not null default '',
  -- Estimated budget in ILS; null if unknown.
  budget numeric(12, 2) check (budget >= 0),
  -- Stored as codes; the UI shows Hebrew labels:
  -- new = חדש, contacted = יצרנו קשר, proposal_sent = הצעה נשלחה,
  -- won = נסגר בהצלחה, lost = אבד.
  status text not null default 'new'
    check (status in ('new', 'contacted', 'proposal_sent', 'won', 'lost')),
  follow_up_date date,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create index leads_follow_up_date_idx on public.leads (follow_up_date);

alter table public.leads enable row level security;

-- profiles has RLS with no policies, so a policy can't read it directly.
-- This function runs as its owner to check the caller's role, and only
-- answers for the caller.
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create policy "Admins can manage leads"
  on public.leads
  for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
