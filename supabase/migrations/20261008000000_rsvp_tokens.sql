-- Each guest gets a secret token for their public RSVP link (/rsvp/<token>).
-- Guest IDs aren't usable for this: they're only unique within an event, and
-- some are predictable (e.g. demo-guest-1). The token is random and global, so
-- the link alone identifies the guest and can't be guessed.
--
-- gen_random_uuid() is volatile, so existing rows each get their own token.
-- The API never writes this column (see guestToRow), so dashboard edits keep
-- a guest's link working.
alter table public.guests
  add column rsvp_token uuid not null default gen_random_uuid();

alter table public.guests
  add constraint guests_rsvp_token_key unique (rsvp_token);
