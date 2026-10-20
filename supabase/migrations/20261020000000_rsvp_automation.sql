-- The daily RSVP automation (/api/cron/rsvp-automation, run by Vercel Cron).
-- Counted back from the event date: the invitation goes out at T-24 days,
-- reminders at T-21 and T-18, and T-15..T-13 is the admins' call phase.

-- How far through the automated messages each guest is: 0 none yet,
-- 1 invited, 2 first reminder, 3 second reminder. A guest is claimed by
-- raising this before their message is sent, so overlapping runs never
-- message the same guest twice. Manual invitations (Guest List → שליחת
-- הודעות) also raise 0 to 1. The API never writes it (see guestToRow).
alter table public.guests
  add column rsvp_automation_stage smallint not null default 0
    check (rsvp_automation_stage between 0 and 3);

-- One row per day the automation ran (Israel date), so a repeated cron call
-- doesn't send the admins a second set of daily reports. finished_at stays
-- null if a run died part-way; a later call that day may then take it over.
create table public.rsvp_automation_runs (
  run_date date primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  planned integer,
  sent integer,
  failed integer
);

-- Like the other tables: no policies, so only the server can read or write.
alter table public.rsvp_automation_runs enable row level security;
