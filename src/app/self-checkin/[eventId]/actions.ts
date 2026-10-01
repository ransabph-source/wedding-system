"use server";

import { headers } from "next/headers";
import { getSupabase } from "@/lib/supabase/server";
import {
  guestFromRow,
  type GuestRow,
  type SeatingTableRow,
} from "@/lib/db/mappers";
import { getConfirmedCount, normalizePhone } from "@/lib/guestRsvp";
import { createRateLimiter } from "@/lib/rateLimit";
import { formatTableLabel } from "@/lib/tableDisplay";
import type { EventPhase } from "@/types/event";
import type { Guest } from "@/types/guest";

// Guests check themselves in without an account, so these actions are public.
// Each one answers for a single phone number and never returns the guest list.
// To make guessing numbers impractical, they only work while the event is
// LIVE, and failed lookups are rate-limited per IP address.

export type TableInfo =
  | { kind: "number"; value: string }
  | { kind: "label"; value: string }
  | { kind: "none" };

export interface CheckInGuest {
  name: string;
  // Seats the guest confirmed; 0 if they haven't confirmed.
  confirmedCount: number;
  table: TableInfo;
}

// "closed": the event isn't LIVE. "rate_limited": too many unknown numbers
// from this network; the guest should go to the hostess desk.
export type CheckInError = "not_found" | "closed" | "rate_limited";

export type LookupResult =
  | { ok: true; guest: CheckInGuest }
  | { ok: false; reason: CheckInError };

export type CheckInResult =
  | { ok: true }
  | { ok: false; reason: CheckInError | "needs_hostess" };

// Guests at a venue often share one public IP, so this only counts misses:
// typos are rare next to the number of guests, while guessing mostly misses.
const failedLookups = createRateLimiter({ limit: 30, windowMs: 10 * 60_000 });

// Shorter inputs could match partial or placeholder numbers.
const MIN_PHONE_DIGITS = 9;

async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0].trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}

async function isCheckInOpen(eventId: string): Promise<boolean> {
  const { data, error } = await getSupabase()
    .from("events")
    .select("phase")
    .eq("id", eventId)
    .maybeSingle<{ phase: EventPhase }>();
  if (error) throw error;
  return data?.phase === "LIVE";
}

// Finds the guest, enforcing the phase check and the rate limit.
async function findGuestGuarded(
  eventId: string,
  phone: unknown,
): Promise<{ ok: true; guest: Guest } | { ok: false; reason: CheckInError }> {
  if (typeof eventId !== "string" || typeof phone !== "string") {
    return { ok: false, reason: "not_found" };
  }
  if (!(await isCheckInOpen(eventId))) return { ok: false, reason: "closed" };

  const limitKey = `${eventId}:${await clientIp()}`;
  if (failedLookups.isLimited(limitKey)) {
    return { ok: false, reason: "rate_limited" };
  }
  const guest = await findGuest(eventId, phone);
  if (!guest) {
    failedLookups.record(limitKey);
    return { ok: false, reason: "not_found" };
  }
  return { ok: true, guest };
}

async function findGuest(eventId: string, phone: string): Promise<Guest | null> {
  const normalized = normalizePhone(phone);
  if (normalized.length < MIN_PHONE_DIGITS) return null;

  const { data, error } = await getSupabase()
    .from("guests")
    .select("*")
    .eq("event_id", eventId)
    .order("seq");
  if (error) throw error;
  const row = (data as GuestRow[]).find(
    (candidate) => normalizePhone(candidate.phone) === normalized,
  );
  return row ? guestFromRow(row) : null;
}

async function getTableInfo(eventId: string, guest: Guest): Promise<TableInfo> {
  const assignment = guest.seatingAssignment;
  if (!assignment) return { kind: "none" };
  if (assignment.kind === "zone") return { kind: "label", value: "אזור הושבה" };

  const { data, error } = await getSupabase()
    .from("seating_tables")
    .select("name")
    .eq("event_id", eventId)
    .eq("id", assignment.id)
    .maybeSingle<Pick<SeatingTableRow, "name">>();
  if (error) throw error;
  if (!data) return { kind: "none" };
  const number = data.name.trim().match(/^(?:שולחן\s*)?(\d+)$/)?.[1];
  return number
    ? { kind: "number", value: number }
    : { kind: "label", value: formatTableLabel(data) };
}

export async function lookupGuest(
  eventId: string,
  phone: string,
): Promise<LookupResult> {
  const found = await findGuestGuarded(eventId, phone);
  if (!found.ok) return found;
  const { guest } = found;
  return {
    ok: true,
    guest: {
      name: guest.name,
      confirmedCount: getConfirmedCount(guest),
      table: await getTableInfo(eventId, guest),
    },
  };
}

// Guests who bring more people than they confirmed (or never confirmed) are
// sent to the hostess desk instead of being checked in.
export async function checkInGuest(
  eventId: string,
  phone: string,
  arrivedCount: number,
): Promise<CheckInResult> {
  const found = await findGuestGuarded(eventId, phone);
  if (!found.ok) return found;
  const { guest } = found;
  if (
    !Number.isInteger(arrivedCount) ||
    arrivedCount < 1 ||
    arrivedCount > getConfirmedCount(guest)
  ) {
    return { ok: false, reason: "needs_hostess" };
  }

  const { error } = await getSupabase()
    .from("guests")
    .update({ arrived: true, arrived_count: arrivedCount })
    .eq("event_id", eventId)
    .eq("id", guest.id);
  if (error) throw error;
  return { ok: true };
}
