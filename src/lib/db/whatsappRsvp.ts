import "server-only";
import { getEvent } from "@/lib/db/events";
import { guestFromRow, type GuestRow } from "@/lib/db/mappers";
import { isGuestRsvpOpen } from "@/lib/eventPhaseRules";
import { MAX_RSVP_COUNT, normalizePhone } from "@/lib/guestRsvp";
import { getSupabase } from "@/lib/supabase/server";
import type { EventRecord } from "@/types/event";
import type { Guest } from "@/types/guest";

// RSVP answers that guests send back as WhatsApp replies. A reply only
// identifies the sender's phone number, so it's matched to the guest who was
// most recently sent an RSVP message from that number.

// count: null confirms the guest's whole invited party.
export type WhatsAppRsvpAnswer =
  | { attending: true; count: number | null }
  | { attending: false };

export type WhatsAppRsvpResult =
  | { ok: true; guest: Guest; event: EventRecord; answer: WhatsAppRsvpAnswer }
  | { ok: false; reason: "unrecognized" | "not_found" | "closed" };

// Button payloads for templates with quick-reply buttons.
const YES_PAYLOAD = "RSVP_YES";
const NO_PAYLOAD = "RSVP_NO";

// \b only knows ASCII letters, so word ends are matched by lookahead.
const NO_PATTERN =
  /^(לא|no|nope|0)(?=\s|$)|לא (מגיע|מגיעה|מגיעים|נגיע|אגיע|נוכל|אוכל)/;
const YES_PATTERN =
  /^(כן|yes|y|ok|אישור|מאשר|מאשרת|מאשרים|מגיע|מגיעה|מגיעים|נגיע|אגיע)(?=\s|$)/;

// Understands "כן", "לא", "כן 3", or a bare number of attendees ("0" declines).
export function parseRsvpReply(
  text: string,
  buttonPayload: string | null,
): WhatsAppRsvpAnswer | null {
  if (buttonPayload === YES_PAYLOAD) return { attending: true, count: null };
  if (buttonPayload === NO_PAYLOAD) return { attending: false };

  const normalized = text
    .trim()
    .toLowerCase()
    .replace(/[!.,?״"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return null;
  if (NO_PATTERN.test(normalized)) return { attending: false };

  const number = normalized.match(/\d+/);
  const count = number ? Number(number[0]) : null;
  if (count !== null && (count < 1 || count > MAX_RSVP_COUNT)) return null;
  // A bare number counts as a yes.
  if (count !== null && /^\d+$/.test(normalized)) {
    return { attending: true, count };
  }
  if (YES_PATTERN.test(normalized)) return { attending: true, count };
  return null;
}

// Phone numbers are stored as typed ("050-1234567", "+972 50 123 4567"...),
// so candidates are narrowed by their last four digits in the query and
// compared normalized here. Only guests already sent an RSVP message count.
async function findContactedGuests(phone: string): Promise<GuestRow[]> {
  const normalized = normalizePhone(phone);
  if (normalized.length < 9) return [];
  const { data, error } = await getSupabase()
    .from("guests")
    .select("*")
    .not("last_contacted_at", "is", null)
    .ilike("phone", `%${normalized.slice(-4)}%`)
    .order("last_contacted_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data as GuestRow[]).filter(
    (row) => normalizePhone(row.phone ?? "") === normalized,
  );
}

export async function applyWhatsAppRsvp(
  fromPhone: string,
  text: string,
  buttonPayload: string | null,
): Promise<WhatsAppRsvpResult> {
  const answer = parseRsvpReply(text, buttonPayload);
  if (!answer) return { ok: false, reason: "unrecognized" };

  const candidates = await findContactedGuests(fromPhone);
  if (candidates.length === 0) return { ok: false, reason: "not_found" };

  // The most recently messaged guest whose event still takes RSVPs.
  let match: { row: GuestRow; event: EventRecord } | null = null;
  for (const row of candidates) {
    const event = await getEvent(row.event_id);
    if (event && isGuestRsvpOpen(event.phase)) {
      match = { row, event };
      break;
    }
  }
  if (!match) return { ok: false, reason: "closed" };

  const guest = guestFromRow(match.row);
  const changes: Record<string, unknown> = answer.attending
    ? {
        rsvp_status: "confirmed",
        confirmed_count: answer.count,
        // Confirmed counts are capped at the party size everywhere they're
        // read, so grow the party to fit.
        ...(answer.count !== null &&
          answer.count > guest.partySize && { party_size: answer.count }),
      }
    : { rsvp_status: "declined", confirmed_count: null };

  const { error } = await getSupabase()
    .from("guests")
    .update(changes)
    .eq("event_id", match.row.event_id)
    .eq("id", match.row.id);
  if (error) throw error;
  return { ok: true, guest, event: match.event, answer };
}
