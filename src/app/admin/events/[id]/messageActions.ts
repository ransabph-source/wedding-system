"use server";

import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { getEvent } from "@/lib/db/events";
import { guestFromRow, type GuestRow } from "@/lib/db/mappers";
import { normalizePhone, wasRecentlyMessaged } from "@/lib/guestRsvp";
import { createRateLimiter } from "@/lib/rateLimit";
import {
  configuredAppUrl,
  ID_CHUNK_SIZE,
  markAutomationInvited,
  MIN_PHONE_DIGITS,
  rsvpTemplate,
  SEND_CONCURRENCY,
  sendRsvpTemplate,
  stampLastContacted,
} from "@/lib/rsvpMessaging";
import { getSupabase } from "@/lib/supabase/server";

// Sends RSVP invitations as the WhatsApp message template described in
// lib/rsvpMessaging (WHATSAPP_RSVP_TEMPLATE). Messaging is a managed
// service, so only admins may trigger it (couples can't, even for their own
// event), and recipients are always looked up from the database, never taken
// from the client.

export type SendMessagesResult =
  | {
      ok: true;
      sent: number;
      // Selected guests that weren't sent: no phone number, or not saved yet.
      skipped: string[];
      // Selected guests left out because they were messaged within
      // MIN_HOURS_BETWEEN_MESSAGES.
      recent: string[];
      // Guests WhatsApp didn't accept the message for.
      failed: string[];
      // Guests WhatsApp never answered for (e.g. a timeout). The message may
      // have arrived, so they're treated as messaged and shouldn't be resent.
      unconfirmed: string[];
      // Guests now counted as messaged (sent or unconfirmed).
      contactedIds: string[];
    }
  | {
      ok: false;
      reason:
        | "unauthorized"
        | "not_configured"
        | "invalid"
        | "rate_limited"
        | "send_failed"
        | "send_unconfirmed";
    };

const MAX_BATCH_SIZE = 2000;

// Test messages go to any number the user types, so they're capped per user.
const testSends = createRateLimiter({ limit: 10, windowMs: 10 * 60_000 });

// A valid-looking token that matches no guest, so a test link opens the
// "not found" page instead of a real guest's RSVP.
const TEST_RSVP_TOKEN = "00000000-0000-0000-0000-000000000000";

interface Recipient {
  guestId: string;
  name: string;
  phone: string;
  rsvpUrl: string;
}

// Server actions can be called directly by anyone signed in, so this check,
// not the admin layout, is what keeps couples and staff out.
async function authorize(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.role === "admin" ? user.id : null;
}

// Links must open for guests on their phones, so production should set
// APP_URL; otherwise this falls back to the address the dashboard is on.
async function appBaseUrl(): Promise<string> {
  const configured = configuredAppUrl();
  if (configured) return configured;
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

export async function sendRsvpMessages(
  eventId: string,
  guestIds: string[],
): Promise<SendMessagesResult> {
  if (typeof eventId !== "string") return { ok: false, reason: "invalid" };
  if (!(await authorize())) return { ok: false, reason: "unauthorized" };
  const template = rsvpTemplate();
  if (!template) return { ok: false, reason: "not_configured" };
  if (
    !Array.isArray(guestIds) ||
    guestIds.length === 0 ||
    guestIds.length > MAX_BATCH_SIZE ||
    !guestIds.every((id) => typeof id === "string")
  ) {
    return { ok: false, reason: "invalid" };
  }

  const event = await getEvent(eventId);
  if (!event) return { ok: false, reason: "invalid" };

  const uniqueIds = [...new Set(guestIds)];
  const rows: GuestRow[] = [];
  for (let i = 0; i < uniqueIds.length; i += ID_CHUNK_SIZE) {
    const { data, error } = await getSupabase()
      .from("guests")
      .select("*")
      .eq("event_id", eventId)
      .in("id", uniqueIds.slice(i, i + ID_CHUNK_SIZE))
      .order("seq");
    if (error) throw error;
    rows.push(...(data as GuestRow[]));
  }

  const baseUrl = await appBaseUrl();
  const recipients: Recipient[] = [];
  const skipped: string[] = [];
  const recent: string[] = [];
  const now = Date.now();
  for (const guest of rows.map(guestFromRow)) {
    // Checked here too, since the dialog's guest list may be out of date.
    if (wasRecentlyMessaged(guest.lastContactedAt, now)) {
      recent.push(guest.name);
      continue;
    }
    const phone = normalizePhone(guest.phone ?? "");
    if (phone.length < MIN_PHONE_DIGITS || !guest.rsvpToken) {
      skipped.push(guest.name);
      continue;
    }
    recipients.push({
      guestId: guest.id,
      name: guest.name,
      phone,
      rsvpUrl: `${baseUrl}/rsvp/${guest.rsvpToken}`,
    });
  }
  // Selected on screen but not in the database (e.g. not saved yet).
  const missing = uniqueIds.length - rows.length;
  if (missing > 0) {
    skipped.push(...Array<string>(missing).fill("אורח שטרם נשמר"));
  }

  if (recipients.length === 0) {
    return {
      ok: true,
      sent: 0,
      skipped,
      recent,
      failed: [],
      unconfirmed: [],
      contactedIds: [],
    };
  }

  const sentIds: string[] = [];
  const unconfirmedIds: string[] = [];
  const failed: string[] = [];
  const unconfirmed: string[] = [];
  for (let i = 0; i < recipients.length; i += SEND_CONCURRENCY) {
    const batch = recipients.slice(i, i + SEND_CONCURRENCY);
    const results = await Promise.all(
      batch.map((recipient) => sendRsvpTemplate(template, event, recipient)),
    );
    results.forEach((result, j) => {
      if (result.ok) sentIds.push(batch[j].guestId);
      else if (result.reason === "unknown") {
        unconfirmedIds.push(batch[j].guestId);
        unconfirmed.push(batch[j].name);
      } else if (result.reason === "invalid_number") skipped.push(batch[j].name);
      else failed.push(batch[j].name);
    });
  }

  // Replies are matched to guests by last_contacted_at, so only guests who
  // were actually sent a message are stamped.
  // They also count as invited, so the automation sends them reminders
  // rather than a second invitation. Unconfirmed sends may have arrived, so
  // they count as sent here too.
  const contactedIds = [...sentIds, ...unconfirmedIds];
  if (contactedIds.length > 0) {
    await stampLastContacted(eventId, contactedIds);
    await markAutomationInvited(eventId, contactedIds);
  }
  if (contactedIds.length === 0 && failed.length > 0) {
    return { ok: false, reason: "send_failed" };
  }
  return {
    ok: true,
    sent: sentIds.length,
    skipped,
    recent,
    failed,
    unconfirmed,
    contactedIds,
  };
}

export async function sendTestMessage(
  eventId: string,
  phone: string,
): Promise<SendMessagesResult> {
  if (typeof eventId !== "string") return { ok: false, reason: "invalid" };
  const userId = await authorize();
  if (!userId) return { ok: false, reason: "unauthorized" };
  const template = rsvpTemplate();
  if (!template) return { ok: false, reason: "not_configured" };

  const normalized = typeof phone === "string" ? normalizePhone(phone) : "";
  if (normalized.length < MIN_PHONE_DIGITS || normalized.length > 15) {
    return { ok: false, reason: "invalid" };
  }
  if (testSends.isLimited(userId)) return { ok: false, reason: "rate_limited" };
  testSends.record(userId);

  const event = await getEvent(eventId);
  if (!event) return { ok: false, reason: "invalid" };

  // Sent with the real template so the test shows exactly what guests get.
  const result = await sendRsvpTemplate(template, event, {
    name: "הודעת נסיון",
    phone: normalized,
    rsvpUrl: `${await appBaseUrl()}/rsvp/${TEST_RSVP_TOKEN}`,
  });
  if (!result.ok) {
    return {
      ok: false,
      reason:
        result.reason === "invalid_number"
          ? "invalid"
          : result.reason === "not_configured"
            ? "not_configured"
            : result.reason === "unknown"
              ? "send_unconfirmed"
              : "send_failed",
    };
  }
  return {
    ok: true,
    sent: 1,
    skipped: [],
    recent: [],
    failed: [],
    unconfirmed: [],
    contactedIds: [],
  };
}
