"use server";

import { findGuestByRsvpToken } from "@/lib/db/rsvp";
import { isGuestRsvpOpen } from "@/lib/eventPhaseRules";
import { MAX_RSVP_COUNT } from "@/lib/guestRsvp";
import { getSupabase } from "@/lib/supabase/server";

// Public: guests answer from the link they were sent, without an account.
// The random token in the link is the only credential. It identifies a single
// guest, and this action can change nothing but that guest's RSVP answer.

export type RsvpAnswer =
  | { attending: true; count: number }
  | { attending: false };

// "closed": the event is locked and RSVPs go through the agency.
export type RsvpResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "closed" | "invalid" };

export async function submitRsvp(
  token: string,
  answer: RsvpAnswer,
): Promise<RsvpResult> {
  const found = await findGuestByRsvpToken(token);
  if (!found) return { ok: false, reason: "not_found" };
  const { guest, event } = found;
  if (!isGuestRsvpOpen(event.phase)) return { ok: false, reason: "closed" };

  let changes: Record<string, unknown>;
  if (answer?.attending === false) {
    changes = { rsvp_status: "declined", confirmed_count: null };
  } else if (answer?.attending === true) {
    // Guests may confirm more seats than they were invited with.
    const { count } = answer;
    if (!Number.isInteger(count) || count < 1 || count > MAX_RSVP_COUNT) {
      return { ok: false, reason: "invalid" };
    }
    changes = {
      rsvp_status: "confirmed",
      confirmed_count: count,
      // Confirmed counts are capped at the party size everywhere they're
      // read, so grow the party to fit.
      ...(count > guest.partySize && { party_size: count }),
    };
  } else {
    return { ok: false, reason: "invalid" };
  }

  const { error } = await getSupabase()
    .from("guests")
    .update(changes)
    .eq("rsvp_token", token);
  if (error) throw error;
  return { ok: true };
}
