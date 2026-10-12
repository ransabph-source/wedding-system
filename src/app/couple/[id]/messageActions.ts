"use server";

import { headers } from "next/headers";
import { canAccessEvent, getCurrentUser } from "@/lib/auth";
import { getEvent } from "@/lib/db/events";
import { guestFromRow, type GuestRow } from "@/lib/db/mappers";
import { normalizePhone } from "@/lib/guestRsvp";
import { createRateLimiter } from "@/lib/rateLimit";
import { getSupabase } from "@/lib/supabase/server";
import type { EventRecord } from "@/types/event";

// Sends RSVP invitations through an external messaging service (e.g. a
// WhatsApp automation), which receives the payload at WEBHOOK_URL and does
// the actual sending. Only the event's couple and admins may trigger it, and
// recipients are always looked up from the database, never taken from the
// client, so nobody can send links for another event's guests.

export type SendMessagesResult =
  | {
      ok: true;
      sent: number;
      // Selected guests that weren't sent: no phone number, or not saved yet.
      skipped: string[];
    }
  | {
      ok: false;
      reason:
        | "unauthorized"
        | "not_configured"
        | "invalid"
        | "rate_limited"
        | "webhook_failed";
    };

// One payload per batch; the webhook can split it further if it needs to.
const MAX_BATCH_SIZE = 2000;
// PostgREST puts filters in the URL, so large ID lists are split.
const ID_CHUNK_SIZE = 100;
const WEBHOOK_TIMEOUT_MS = 15_000;
// Shorter inputs can't be a real phone number.
const MIN_PHONE_DIGITS = 9;

// Test messages go to any number the user types, so they're capped per user.
const testSends = createRateLimiter({ limit: 10, windowMs: 10 * 60_000 });

// A valid-looking token that matches no guest, so a test link opens the
// "not found" page instead of a real guest's RSVP.
const TEST_RSVP_TOKEN = "00000000-0000-0000-0000-000000000000";

interface WebhookRecipient {
  guestId: string | null;
  name: string;
  phone: string;
  rsvpUrl: string;
}

interface WebhookPayload {
  type: "rsvp_invitation";
  // True for test sends; the recipient isn't a guest and the link is a dummy.
  test: boolean;
  event: { id: string; coupleNames: string; eventDate: string; venue: string };
  recipients: WebhookRecipient[];
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

function eventSummary(event: EventRecord): WebhookPayload["event"] {
  return {
    id: event.id,
    coupleNames: event.coupleNames,
    eventDate: event.eventDate,
    venue: event.venue,
  };
}

async function postToWebhook(
  url: string,
  payload: WebhookPayload,
): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!response.ok) {
      console.error(`RSVP webhook responded ${response.status}`);
    }
    return response.ok;
  } catch (error) {
    console.error("RSVP webhook request failed", error);
    return false;
  }
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
  const webhookUrl = process.env.WEBHOOK_URL?.trim();
  if (!webhookUrl) return { ok: false, reason: "not_configured" };
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
  const recipients: WebhookRecipient[] = [];
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

  if (recipients.length === 0) return { ok: true, sent: 0, skipped };

  const delivered = await postToWebhook(webhookUrl, {
    type: "rsvp_invitation",
    test: false,
    event: eventSummary(event),
    recipients,
  });
  if (!delivered) return { ok: false, reason: "webhook_failed" };
  await stampLastContacted(
    eventId,
    recipients.map((recipient) => recipient.guestId!),
  );
  return { ok: true, sent: recipients.length, skipped };
}

export async function sendTestMessage(
  eventId: string,
  phone: string,
): Promise<SendMessagesResult> {
  if (typeof eventId !== "string") return { ok: false, reason: "invalid" };
  const userId = await authorize(eventId);
  if (!userId) return { ok: false, reason: "unauthorized" };
  const webhookUrl = process.env.WEBHOOK_URL?.trim();
  if (!webhookUrl) return { ok: false, reason: "not_configured" };

  const normalized = typeof phone === "string" ? normalizePhone(phone) : "";
  if (normalized.length < MIN_PHONE_DIGITS || normalized.length > 15) {
    return { ok: false, reason: "invalid" };
  }
  if (testSends.isLimited(userId)) return { ok: false, reason: "rate_limited" };
  testSends.record(userId);

  const event = await getEvent(eventId);
  if (!event) return { ok: false, reason: "invalid" };

  const delivered = await postToWebhook(webhookUrl, {
    type: "rsvp_invitation",
    test: true,
    event: eventSummary(event),
    recipients: [
      {
        guestId: null,
        name: "הודעת נסיון",
        phone: normalized,
        rsvpUrl: `${await appBaseUrl()}/rsvp/${TEST_RSVP_TOKEN}`,
      },
    ],
  });
  if (!delivered) return { ok: false, reason: "webhook_failed" };
  return { ok: true, sent: 1, skipped: [] };
}
