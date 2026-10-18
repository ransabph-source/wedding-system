-- The couple's budget (ניהול תקציב): one row per expense, with what it
-- actually cost and how much has been paid so far, in NIS.
create table public.budget_items (
  event_id text not null references public.events (id) on delete cascade,
  id text not null,
  -- Preserves the order rows were added in, even within one bulk insert.
  seq bigint generated always as identity,
  category text not null default '',
  supplier text not null default '',
  actual_cost numeric(12, 2) not null default 0 check (actual_cost >= 0),
  paid_amount numeric(12, 2) not null default 0 check (paid_amount >= 0),
  primary key (event_id, id)
);

create index budget_items_event_seq_idx on public.budget_items (event_id, seq);

-- Set once the default categories (src/lib/budgetCategories.ts) have been
-- added to the event's budget, so a couple who deletes them all doesn't get
-- them back on the next load.
alter table public.events add column budget_initialized_at timestamptz;

-- Like the other event tables: no policies, so only the server (which uses
-- the secret key) can read or write. /api/events/[eventId]/budget lets the
-- couple and admins in, and keeps hostesses out.
alter table public.budget_items enable row level security;
