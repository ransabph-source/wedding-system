-- When the guest was last sent an RSVP message through the messaging webhook
-- (Guest List → שליחת הודעות), so admins can see when the latest reminder
-- went out. Null until the first message. Only the send action writes it; the
-- API never does (see guestToRow), so dashboard edits keep it.
alter table public.guests
  add column last_contacted_at timestamptz;
