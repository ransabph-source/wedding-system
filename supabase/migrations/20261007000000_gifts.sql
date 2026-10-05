-- The couple's gift ledger (ניהול מתנות): who gave, how many came, and how
-- much they gave in NIS. Rows are typed in spreadsheet-style, so every field
-- may be blank while a row is being filled in.
create table public.gifts (
  event_id text not null references public.events (id) on delete cascade,
  id text not null,
  seq bigint generated always as identity,
  guest_name text not null default '',
  attendees integer check (attendees >= 0),
  amount integer check (amount >= 0),
  primary key (event_id, id)
);

create index gifts_event_seq_idx on public.gifts (event_id, seq);

-- Like the other event tables: no policies, so only the server (which uses
-- the secret key) can read or write. /api/events/[eventId]/gifts lets the
-- couple and admins in, and keeps hostesses out.
alter table public.gifts enable row level security;
