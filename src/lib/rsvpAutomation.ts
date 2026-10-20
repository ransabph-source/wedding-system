import "server-only";
import { eventFromRow, type EventRow, type GuestRow } from "@/lib/db/mappers";
import { isGuestRsvpOpen } from "@/lib/eventPhaseRules";
import { normalizePhone } from "@/lib/guestRsvp";
import {
  configuredAppUrl,
  ID_CHUNK_SIZE,
  MIN_PHONE_DIGITS,
  rsvpReminderTemplate,
  rsvpTemplate,
  SEND_CONCURRENCY,
  sendRsvpTemplate,
  stampLastContacted,
} from "@/lib/rsvpMessaging";
import { getSupabase } from "@/lib/supabase/server";
import { sendWhatsAppTemplate, sendWhatsAppText } from "@/lib/whatsapp";
import type { EventRecord } from "@/types/event";
import type { Guest } from "@/types/guest";

// The daily RSVP automation, run by Vercel Cron through
// /api/cron/rsvp-automation. Counted back from the event date (Israel time):
//
//   T-24  invitation to every guest who hasn't answered
//   T-21  first reminder to those still pending
//   T-18  second reminder
//   T-15, T-14, T-13  call phase: no messages; the admins phone the
//         remaining guests and update their status after each round
//
// A missed day is caught up later in the same window (e.g. guests added at
// T-23 are invited that day). Each guest moves one step per run, at least
// MIN_HOURS_BETWEEN_MESSAGES after they were last messaged, and their
// rsvp_automation_stage is raised before sending, so no step goes out twice.
//
// The admins (ADMIN_WHATSAPP_NUMBER) get a WhatsApp report before and after
// the sends, plus one per event in its call phase with the guests still
// pending that day.

const TIME_ZONE = "Asia/Jerusalem";
const DAY_MS = 86_400_000;
const INVITATION_DAYS_BEFORE = 24;
const CALL_PHASE_FIRST_DAY = 15;
const CALL_PHASE_DAYS = 3;
// Less than the 3 days between steps, so cron timing jitter never skips one.
const MIN_HOURS_BETWEEN_MESSAGES = 36;
// Supabase returns at most this many rows per request.
const PAGE_SIZE = 1000;
// Longer than the route's maxDuration, so a live run is never taken over.
const STALE_RUN_MS = 15 * 60_000;
const PENDING_STATUSES: Guest["rsvpStatus"][] = ["pending_whatsapp", "needs_call"];

type Stage = 1 | 2 | 3;

type AutomationGuestRow = Pick<
  GuestRow,
  "id" | "name" | "phone" | "rsvp_token" | "last_contacted_at"
> & { rsvp_automation_stage: number };

const GUEST_COLUMNS =
  "id, name, phone, rsvp_token, last_contacted_at, rsvp_automation_stage";

interface PlannedSend {
  guest: AutomationGuestRow;
  stage: Stage;
}

interface CallPhaseReport {
  event: EventRecord;
  day: number;
  pending: number;
}

export type RsvpAutomationSummary =
  | { status: "already_ran"; date: string }
  | {
      status: "done";
      date: string;
      planned: number;
      sent: number;
      failed: number;
      callPhaseEvents: number;
    };

// Today's date in Israel as YYYY-MM-DD.
export function israelDate(now: Date): string {
  // en-CA formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS,
  );
}

// The step guests should have reached with this many days left, or 0
// outside the messaging days.
export function targetStage(daysLeft: number): 0 | Stage {
  if (daysLeft > INVITATION_DAYS_BEFORE) return 0;
  if (daysLeft > 21) return 1;
  if (daysLeft > 18) return 2;
  if (daysLeft > CALL_PHASE_FIRST_DAY) return 3;
  return 0;
}

// 1, 2 or 3 during the call phase, otherwise null.
export function callPhaseDay(daysLeft: number): number | null {
  const day = CALL_PHASE_FIRST_DAY - daysLeft + 1;
  return day >= 1 && day <= CALL_PHASE_DAYS ? day : null;
}

// Marks today's run as started. False if it already ran (or is running)
// today, e.g. when Vercel delivers the cron call twice.
async function claimRun(runDate: string): Promise<boolean> {
  const { error } = await getSupabase()
    .from("rsvp_automation_runs")
    .insert({ run_date: runDate });
  if (!error) return true;
  if (error.code !== "23505") throw error;

  // A run that died part-way leaves finished_at empty; take it over.
  const { data, error: takeoverError } = await getSupabase()
    .from("rsvp_automation_runs")
    .update({ started_at: new Date().toISOString() })
    .eq("run_date", runDate)
    .is("finished_at", null)
    .lt("started_at", new Date(Date.now() - STALE_RUN_MS).toISOString())
    .select("run_date");
  if (takeoverError) throw takeoverError;
  return data.length > 0;
}

async function finishRun(
  runDate: string,
  totals: { planned: number; sent: number; failed: number },
) {
  const { error } = await getSupabase()
    .from("rsvp_automation_runs")
    .update({ finished_at: new Date().toISOString(), ...totals })
    .eq("run_date", runDate);
  if (error) console.error("Failed to record the RSVP automation run", error);
}

async function fetchEvents(today: string): Promise<EventRecord[]> {
  const { data, error } = await getSupabase()
    .from("events")
    .select("*")
    .gte("event_date", addDays(today, CALL_PHASE_FIRST_DAY - CALL_PHASE_DAYS + 1))
    .lte("event_date", addDays(today, INVITATION_DAYS_BEFORE))
    .order("event_date");
  if (error) throw error;
  return (data as EventRow[])
    .map(eventFromRow)
    .filter((event) => isGuestRsvpOpen(event.phase));
}

async function fetchPendingGuests(
  eventId: string,
  belowStage: Stage,
): Promise<AutomationGuestRow[]> {
  const rows: AutomationGuestRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await getSupabase()
      .from("guests")
      .select(GUEST_COLUMNS)
      .eq("event_id", eventId)
      .in("rsvp_status", PENDING_STATUSES)
      .lt("rsvp_automation_stage", belowStage)
      .order("seq")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data as unknown as AutomationGuestRow[]));
    if (data.length < PAGE_SIZE) return rows;
  }
}

// Counted when the report is sent, so it reflects the statuses the admins
// updated after the previous day's calls.
async function countPendingGuests(eventId: string): Promise<number> {
  const { count, error } = await getSupabase()
    .from("guests")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .in("rsvp_status", PENDING_STATUSES);
  if (error) throw error;
  return count ?? 0;
}

function planSends(guests: AutomationGuestRow[], now: Date): PlannedSend[] {
  const contactedBefore =
    now.getTime() - MIN_HOURS_BETWEEN_MESSAGES * 3_600_000;
  return guests
    .filter(
      (guest) =>
        guest.rsvp_token &&
        normalizePhone(guest.phone ?? "").length >= MIN_PHONE_DIGITS &&
        (!guest.last_contacted_at ||
          Date.parse(guest.last_contacted_at) <= contactedBefore),
    )
    .map((guest) => ({
      guest,
      stage: (guest.rsvp_automation_stage + 1) as Stage,
    }));
}

// Raises the guests' stage before they're messaged. Only the IDs returned
// were still at the previous stage, i.e. not taken by an overlapping run.
async function claimGuests(
  eventId: string,
  stage: Stage,
  guestIds: string[],
): Promise<Set<string>> {
  const claimed = new Set<string>();
  for (let i = 0; i < guestIds.length; i += ID_CHUNK_SIZE) {
    const { data, error } = await getSupabase()
      .from("guests")
      .update({ rsvp_automation_stage: stage })
      .eq("event_id", eventId)
      .eq("rsvp_automation_stage", stage - 1)
      .in("id", guestIds.slice(i, i + ID_CHUNK_SIZE))
      .select("id");
    if (error) throw error;
    for (const row of data as { id: string }[]) claimed.add(row.id);
  }
  return claimed;
}

// Puts guests whose message failed back a stage, so a later run retries.
async function releaseGuests(eventId: string, stage: Stage, guestIds: string[]) {
  for (let i = 0; i < guestIds.length; i += ID_CHUNK_SIZE) {
    const { error } = await getSupabase()
      .from("guests")
      .update({ rsvp_automation_stage: stage - 1 })
      .eq("event_id", eventId)
      .eq("rsvp_automation_stage", stage)
      .in("id", guestIds.slice(i, i + ID_CHUNK_SIZE));
    if (error) console.error("Failed to release RSVP automation guests", error);
  }
}

async function sendEventMessages(
  event: EventRecord,
  sends: PlannedSend[],
  baseUrl: string,
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  for (const stage of [1, 2, 3] as const) {
    const batch = sends.filter((send) => send.stage === stage);
    if (batch.length === 0) continue;
    const template = stage === 1 ? rsvpTemplate() : rsvpReminderTemplate();
    if (!template) {
      failed += batch.length;
      continue;
    }

    const claimed = await claimGuests(
      event.id,
      stage,
      batch.map((send) => send.guest.id),
    );
    const recipients = batch.filter((send) => claimed.has(send.guest.id));
    const sentIds: string[] = [];
    const retryIds: string[] = [];
    for (let i = 0; i < recipients.length; i += SEND_CONCURRENCY) {
      const chunk = recipients.slice(i, i + SEND_CONCURRENCY);
      const results = await Promise.all(
        chunk.map(({ guest }) =>
          sendRsvpTemplate(template, event, {
            name: guest.name,
            phone: normalizePhone(guest.phone ?? ""),
            rsvpUrl: `${baseUrl}/rsvp/${guest.rsvp_token}`,
          }),
        ),
      );
      results.forEach((result, j) => {
        if (result.ok) sentIds.push(chunk[j].guest.id);
        // A number WhatsApp can't take won't work tomorrow either.
        else if (result.reason !== "invalid_number") {
          retryIds.push(chunk[j].guest.id);
        }
      });
    }

    if (sentIds.length > 0) await stampLastContacted(event.id, sentIds);
    if (retryIds.length > 0) await releaseGuests(event.id, stage, retryIds);
    sent += sentIds.length;
    failed += recipients.length - sentIds.length;
  }
  return { sent, failed };
}

function adminNumbers(): string[] {
  return (process.env.ADMIN_WHATSAPP_NUMBER ?? "")
    .split(/[,;]/)
    .map((number) => number.trim())
    .filter(Boolean);
}

// Free-form texts only reach an admin who messaged the business number in
// the last 24 hours, so production should set ADMIN_WHATSAPP_TEMPLATE: an
// approved template whose body is just {{1}}, which gets the report text.
async function notifyAdmins(text: string) {
  const numbers = adminNumbers();
  if (numbers.length === 0) {
    console.warn("ADMIN_WHATSAPP_NUMBER is not set; skipping:", text);
    return;
  }
  const template = process.env.ADMIN_WHATSAPP_TEMPLATE?.trim();
  const language =
    process.env.ADMIN_WHATSAPP_TEMPLATE_LANGUAGE?.trim() || "en";
  // Template parameters may not contain line breaks or runs of spaces.
  const body = text.replace(/\s+/g, " ").trim();
  for (const number of numbers) {
    const result = template
      ? await sendWhatsAppTemplate(number, template, language, [body])
      : await sendWhatsAppText(number, body);
    if (!result.ok) {
      console.error(`Admin WhatsApp report failed (${result.reason}):`, body);
    }
  }
}

export async function runRsvpAutomation(
  now = new Date(),
): Promise<RsvpAutomationSummary> {
  const today = israelDate(now);
  if (!(await claimRun(today))) return { status: "already_ran", date: today };

  const plans: { event: EventRecord; sends: PlannedSend[] }[] = [];
  const callPhase: { event: EventRecord; day: number }[] = [];
  for (const event of await fetchEvents(today)) {
    const daysLeft = daysBetween(today, event.eventDate);
    const stage = targetStage(daysLeft);
    if (stage > 0) {
      const sends = planSends(
        await fetchPendingGuests(event.id, stage as Stage),
        now,
      );
      if (sends.length > 0) plans.push({ event, sends });
    }
    const day = callPhaseDay(daysLeft);
    if (day !== null) callPhase.push({ event, day });
  }

  const planned = plans.reduce((sum, plan) => sum + plan.sends.length, 0);
  await notifyAdmins(
    `Today's automation schedule: ${planned} automated messages to send.`,
  );

  let sent = 0;
  let failed = 0;
  const baseUrl = configuredAppUrl();
  if (!baseUrl && planned > 0) {
    console.error("APP_URL is not set; RSVP links can't be built");
  }
  for (const { event, sends } of plans) {
    if (!baseUrl) {
      failed += sends.length;
      continue;
    }
    try {
      const result = await sendEventMessages(event, sends, baseUrl);
      sent += result.sent;
      failed += result.failed;
    } catch (error) {
      console.error(`RSVP automation failed for event ${event.id}`, error);
      failed += sends.length;
    }
  }
  await notifyAdmins(
    `Successfully sent ${sent} automated messages.` +
      (failed > 0 ? ` ${failed} could not be sent.` : ""),
  );

  const reports: CallPhaseReport[] = [];
  for (const { event, day } of callPhase) {
    reports.push({ event, day, pending: await countPendingGuests(event.id) });
  }
  for (const { event, day, pending } of reports) {
    await notifyAdmins(
      `Event ${event.coupleNames} is in the Call Phase (Day ${day} of ${CALL_PHASE_DAYS}). ` +
        `You have ${pending} pending guests to call today.`,
    );
  }

  await finishRun(today, { planned, sent, failed });
  return {
    status: "done",
    date: today,
    planned,
    sent,
    failed,
    callPhaseEvents: reports.length,
  };
}
