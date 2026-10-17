-- The AI seating assistant (/api/ai-seating). ai_usage_count counts the
-- requests sent to the model, so each event gets a fixed quota.
-- is_seating_locked lets the couple turn the assistant off once seating is
-- final.
alter table public.events
  add column ai_usage_count integer not null default 0
    check (ai_usage_count >= 0),
  add column is_seating_locked boolean not null default false;

-- Claims one AI request for the event: it increments ai_usage_count only if
-- seating isn't locked and the count is still below usage_limit. It returns
-- the new count, or null if nothing was claimed. The check and the increment
-- are one statement, so two concurrent requests can't both take the last
-- slot. The route looks up why when it gets null.
create function public.claim_ai_seating_request(
  target_event_id text,
  usage_limit integer
)
returns integer
language sql
set search_path = ''
as $$
  update public.events
  set ai_usage_count = ai_usage_count + 1
  where id = target_event_id
    and not is_seating_locked
    and ai_usage_count < usage_limit
  returning ai_usage_count;
$$;

-- Only the server (secret key) may claim requests.
revoke execute on function public.claim_ai_seating_request(text, integer)
  from public, anon, authenticated;
