-- Hall floor plans (סקיצת אולם) uploaded by couples on the seating screen and
-- shown to hostesses on the live screen. One image per event, stored at
-- floor-plans/<event id>.
--
-- The bucket is private and has no storage policies, so the browser can't
-- read or write it directly. All access goes through
-- /api/events/[eventId]/floor-plan, which checks the caller's access to the
-- event with the server-only secret key and hands out short-lived signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'floor-plans',
  'floor-plans',
  false,
  10485760, -- 10 MB
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;
