import "server-only";
import { getEvent } from "@/lib/db/events";
import { guestFromRow, type GuestRow } from "@/lib/db/mappers";
import { getSupabase } from "@/lib/supabase/server";
import type { EventRecord } from "@/types/event";
import type { Guest } from "@/types/guest";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Anything else would make Postgres reject the uuid comparison with an error
// instead of simply finding nothing.
export function isRsvpToken(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

// The guest behind a public RSVP link, and their event. The token is the
// only credential, so callers must not reveal anything beyond this guest.
export async function findGuestByRsvpToken(
  token: string,
): Promise<{ eventId: string; guest: Guest; event: EventRecord } | null> {
  if (!isRsvpToken(token)) return null;
  const { data, error } = await getSupabase()
    .from("guests")
    .select("*")
    .eq("rsvp_token", token)
    .maybeSingle<GuestRow>();
  if (error) throw error;
  if (!data) return null;
  const event = await getEvent(data.event_id);
  if (!event) return null;
  return { eventId: data.event_id, guest: guestFromRow(data), event };
}
