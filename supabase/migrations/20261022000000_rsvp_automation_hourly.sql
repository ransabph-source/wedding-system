-- The RSVP automation now runs at several Israel hours a day (10:00
-- invitations and call phase reports, 15:00 first reminders, 18:00 second
-- reminders), so a run is recorded per date and hour. Runs before this were
-- once a day, in the 10:00 or 11:00 hour.
alter table public.rsvp_automation_runs
  add column run_hour smallint not null default 10
    check (run_hour between 0 and 23);
alter table public.rsvp_automation_runs alter column run_hour drop default;

alter table public.rsvp_automation_runs
  drop constraint rsvp_automation_runs_pkey;
alter table public.rsvp_automation_runs
  add primary key (run_date, run_hour);
