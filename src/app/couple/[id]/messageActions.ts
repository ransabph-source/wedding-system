"use server";

import { headers } from "next/headers";
import { canAccessEvent, getCurrentUser } from "@/lib/auth";
import { getEvent } from "@/lib/db/events";
import { guestFromRow, type GuestRow } from "@/lib/db/mappers";
import { normalizePhone } from "@/lib/guestRsvp";
import { createRateLimiter } from "@/lib/rateLimit";
import { getSupabase } from "@/lib/supabase/server";
import { isWhatsAppConfigured, sendWhatsAppTemplate } from "@/lib/whatsapp";
import type { EventRecord } from "@/types/event";

// Sends RSVP invitations as a WhatsApp message template (WHATSAPP_RSVP_TEMPLATE,
// approved in WhatsApp Manager) whose body takes {{1}} guest name, {{2}} couple
// names, {{3}} the guest's RSVP link. Only the event's couple and admins may
// trigger it, and recipients are always looked up from the database, never
// taken from the client, so nobody can send links for another event's guests.

export type SendMessagesResult =
  | {
      ok: true;
      sent: number;
      // Selected guests that weren't sent: no phone number, or not saved yet.
      skipped: string[];
      // Guests WhatsApp didn't accept the message for.
      failed: string[];
    }
  | {
      ok: false;
      reason:
        | "unauthorized"
        | "not_configured"
        | "invalid"
        | "rate_limited"
        | "send_failed";
    };

const MAX_BATCH_SIZE = 2000;
// PostgREST puts filters in the URL, so large ID lists are split.
const ID_CHUNK_SIZE = 100;
// WhatsApp takes one recipient per request; this many run at once.
const SEND_CONCURRENCY = 10;
// Shorter inputs can't be a real phone number.
const MIN_PHONE_DIGITS = 9;

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

interface RsvpTemplate {
  name: string;
  language: string;
}

function rsvpTemplate(): RsvpTemplate | null {
  const name = process.env.WHATSAPP_RSVP_TEMPLATE?.trim();
  if (!name || !isWhatsAppConfigured()) return null;
  return {
    name,
    language: process.env.WHATSAPP_RSVP_TEMPLATE_LANGUAGE?.trim() || "he",
  };
}

async function authorize(eventId: string): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user || !(await canAccessEvent(user, eventId, "edit"))) return null;
  return user.id;
}

// Links must open for guests on their phones, so production should set
// APP_URL; otherwise this falls back to the address the dashboard is on.
async function appBaseUrl(): Promise<string> {
  const configured = process.env.APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

function sendRsvpTemplate(
  template: RsvpTemplate,
  event: EventRecord,
  recipient: { name: string; phone: string; rsvpUrl: string },
) {
  return sendWhatsAppTemplate(recipient.phone, template.name, template.language, [
    recipient.name,
    event.coupleNames,
    recipient.rsvpUrl,
  ]);
}

// Records when the guests were last messaged. The messages are already out
// by now, so a failure here is logged rather than reported as a failed send.
async function stampLastContacted(eventId: string, guestIds: string[]) {
  const sentAt = new Date().toISOString();
  for (let i = 0; i < guestIds.length; i += ID_CHUNK_SIZE) {
    const { error } = await getSupabase()
      .from("guests")
      .update({ last_contacted_at: sentAt })
      .eq("event_id", eventId)
      .in("id", guestIds.slice(i, i + ID_CHUNK_SIZE));
    if (error) console.error("Failed to stamp last_contacted_at", error);
  }
}

export async function sendRsvpMessages(
  eventId: string,
  guestIds: string[],
): Promise<SendMessagesResult> {
  if (typeof eventId !== "string") return { ok: false, reason: "invalid" };
  if (!(await authorize(eventId))) return { ok: false, reason: "unauthorized" };
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
  for (const guest of rows.map(guestFromRow)) {
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
    return { ok: true, sent: 0, skipped, failed: [] };
  }

  const sentIds: string[] = [];
  const failed: string[] = [];
  for (let i = 0; i < recipients.length; i += SEND_CONCURRENCY) {
    const batch = recipients.slice(i, i + SEND_CONCURRENCY);
    const results = await Promise.all(
      batch.map((recipient) => sendRsvpTemplate(template, event, recipient)),
    );
    results.forEach((result, j) => {
      if (result.ok) sentIds.push(batch[j].guestId);
      else if (result.reason === "invalid_number") skipped.push(batch[j].name);
      else failed.push(batch[j].name);
    });
  }

  // Replies are matched to guests by last_contacted_at, so only guests who
  // were actually sent a message are stamped.
  if (sentIds.length > 0) await stampLastContacted(eventId, sentIds);
  if (sentIds.length === 0 && failed.length > 0) {
    return { ok: false, reason: "send_failed" };
  }
  return { ok: true, sent: sentIds.length, skipped, failed };
}

export async function sendTestMessage(
  eventId: string,
  phone: string,
): Promise<SendMessagesResult> {
  if (typeof eventId !== "string") return { ok: false, reason: "invalid" };
  const userId = await authorize(eventId);
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
            : "send_failed",
    };
  }
  return { ok: true, sent: 1, skipped: [], failed: [] };
}
