-- Leads CRM: drop the budget field, add the 'closed' status, and store a
-- contact phone on events so a lead's phone carries over when it's converted.

alter table public.leads drop column budget;

-- closed = סגר: the lead was converted into an event.
alter table public.leads drop constraint leads_status_check;
alter table public.leads add constraint leads_status_check
  check (status in ('new', 'contacted', 'proposal_sent', 'won', 'closed', 'lost'));

-- The couple's contact phone; empty if unknown.
alter table public.events add column phone text not null default '';
