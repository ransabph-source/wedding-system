import "server-only";
import { getSupabase } from "@/lib/supabase/server";
import {
  isWhatsAppConfigured,
  sendWhatsAppTemplate,
  type WhatsAppSendResult,
} from "@/lib/whatsapp";
import type { EventRecord } from "@/types/event";

// RSVP invitations go out as a WhatsApp message template (approved in
// WhatsApp Manager) whose body takes {{1}} guest name, {{2}} couple names,
// {{3}} event date, {{4}} venue, {{5}} the guest's RSVP link. Meta rejects the
// send unless exactly these 5 are passed. Used by the admin's manual sends and
// by the daily automation (/api/cron/rsvp-automation).

export interface RsvpTemplate {
  name: string;
  language: string;
}

// PostgREST puts filters in the URL, so large ID lists are split.
export const ID_CHUNK_SIZE = 100;
// WhatsApp takes one recipient per request; this many run at once.
export const SEND_CONCURRENCY = 10;
// Shorter inputs can't be a real phone number.
export const MIN_PHONE_DIGITS = 9;

export function rsvpTemplate(): RsvpTemplate | null {
  const name = process.env.WHATSAPP_RSVP_TEMPLATE?.trim();
  if (!name || !isWhatsAppConfigured()) return null;
  return {
    name,
    language: process.env.WHATSAPP_RSVP_TEMPLATE_LANGUAGE?.trim() || "he",
  };
}

// The automated reminders may use their own template (same 5 variables);
// without one they resend the invitation template.
export function rsvpReminderTemplate(): RsvpTemplate | null {
  const invitation = rsvpTemplate();
  const name = process.env.WHATSAPP_RSVP_REMINDER_TEMPLATE?.trim();
  if (!invitation || !name) return invitation;
  return {
    name,
    language:
      process.env.WHATSAPP_RSVP_REMINDER_TEMPLATE_LANGUAGE?.trim() ||
      invitation.language,
  };
}

// The app's public address from the environment: APP_URL, or on Vercel the
// production domain it provides. Null when neither is set.
export function configuredAppUrl(): string | null {
  const configured = process.env.APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  return vercelHost ? `https://${vercelHost}` : null;
}

// eventDate is a plain YYYY-MM-DD string; guests read DD/MM/YYYY.
function formatTemplateDate(eventDate: string): string {
  const [year, month, day] = eventDate.split("-");
  return year && month && day ? `${day}/${month}/${year}` : eventDate;
}

// Meta rejects empty template parameters, so blank fields get a placeholder.
function templateParam(value: string): string {
  return value.trim() || "-";
}

export function sendRsvpTemplate(
  template: RsvpTemplate,
  event: EventRecord,
  recipient: { name: string; phone: string; rsvpUrl: string },
): Promise<WhatsAppSendResult> {
  return sendWhatsAppTemplate(
    recipient.phone,
    template.name,
    template.language,
    [
      recipient.name,
      event.coupleNames,
      formatTemplateDate(event.eventDate),
      event.venue,
      recipient.rsvpUrl,
    ].map(templateParam),
  );
}

// Records when the guests were last messaged. The messages are already out
// by now, so a failure here is logged rather than reported as a failed send.
export async function stampLastContacted(eventId: string, guestIds: string[]) {
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

// Guests invited by hand count as having had the automation's first message,
// so it follows up with reminders instead of inviting them again.
export async function markAutomationInvited(
  eventId: string,
  guestIds: string[],
) {
  for (let i = 0; i < guestIds.length; i += ID_CHUNK_SIZE) {
    const { error } = await getSupabase()
      .from("guests")
      .update({ rsvp_automation_stage: 1 })
      .eq("event_id", eventId)
      .eq("rsvp_automation_stage", 0)
      .in("id", guestIds.slice(i, i + ID_CHUNK_SIZE));
    if (error) console.error("Failed to mark guests as invited", error);
  }
}
