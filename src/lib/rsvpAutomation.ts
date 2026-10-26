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
import {
  addDays,
  CALL_PHASE_DAYS,
  CALL_REPORT_HOUR,
  campaignSchedule,
  DEADLINE_DAYS_BEFORE,
  israelDateTime,
  MAX_INVITATION_DAYS_BEFORE,
  STAGE_SEND_HOURS,
  type CampaignSchedule,
  type Stage,
} from "@/lib/rsvpSchedule";
import { getSupabase } from "@/lib/supabase/server";
import { sendWhatsAppTemplate, sendWhatsAppText } from "@/lib/whatsapp";
import type { EventRecord } from "@/types/event";
import type { Guest } from "@/types/guest";

// The RSVP automation, run hourly by Vercel Cron through
// /api/cron/rsvp-automation. Each event follows the timeline in
// lib/rsvpSchedule: the invitation, two reminders and three call phase days,
// all on working days and all done by T-7. Each message goes out at its own
// Israel hour (STAGE_SEND_HOURS): a run at 10:00 sends the invitations due,
// 15:00 the first reminders and 18:00 the second ones; runs at other hours
// do nothing. During the call phase there are no messages; the admins phone
// the remaining guests and update their status after each round.
//
// Nothing runs on rest days (see lib/restDays): the cron route exits before
// any message or report, and the timeline was planned around them.
//
// Guests move up exactly one step per message, so none is skipped: a guest
// who fell behind (e.g. after a failed send) gets the next message in order,
// at that message's hour. Each guest gets at most one message per run, at
// least MIN_HOURS_BETWEEN_MESSAGES after they were last messaged, and their
// rsvp_automation_stage is raised before sending, so no message goes out
// twice. Only a send Meta turned down puts the guest back for a retry; when
// Meta's answer never came (a timeout or a server error) the message may
// have arrived, so it counts as sent and is never repeated. Messages stop
// when the call phase starts.
//
// The admins (ADMIN_WHATSAPP_NUMBER) get a WhatsApp report before and after
// each run that has messages to send, plus one at CALL_REPORT_HOUR per event
// in its call phase with the guests still pending that day.

// Less than the 3 days between steps, so cron timing jitter never skips one.
const MIN_HOURS_BETWEEN_MESSAGES = 36;
// Supabase returns at most this many rows per request.
const PAGE_SIZE = 1000;
// Longer than the route's maxDuration, so a live run is never taken over.
const STALE_RUN_MS = 15 * 60_000;
const PENDING_STATUSES: Guest["rsvpStatus"][] = ["pending_whatsapp", "needs_call"];
const STAGE_NAMES: Record<Stage, string> = {
  1: "invitation",
  2: "first reminder",
  3: "second reminder",
};

type AutomationGuestRow = Pick<
  GuestRow,
  "id" | "name" | "phone" | "rsvp_token" | "last_contacted_at"
> & { rsvp_automation_stage: number };

const GUEST_COLUMNS =
  "id, name, phone, rsvp_token, last_contacted_at, rsvp_automation_stage";

interface PlannedSend {
  guest: AutomationGuestRow;
  // The guest's stage now, and the one this message brings them to.
  from: number;
  to: Stage;
}

interface CallPhaseReport {
  event: EventRecord;
  day: number;
  pending: number;
}

export type RsvpAutomationSummary =
  | { status: "idle" | "already_ran"; date: string; hour: number }
  | {
      status: "done";
      date: string;
      hour: number;
      planned: number;
      sent: number;
      failed: number;
      // Sent without Meta confirming it; not retried.
      unconfirmed: number;
      callPhaseEvents: number;
    };

// The message that goes out at this Israel hour, if any.
export function stageSentAt(hour: number): Stage | null {
  for (const stage of [1, 2, 3] as const) {
    if (STAGE_SEND_HOURS[stage] === hour) return stage;
  }
  return null;
}

// Whether this hour has anything to do: a message or the call reports.
export function isAutomationHour(hour: number): boolean {
  return stageSentAt(hour) !== null || hour === CALL_REPORT_HOUR;
}

// Whether guests may get this message today: it's due and the call phase
// hasn't started.
function isStageDue(
  schedule: CampaignSchedule,
  stage: Stage,
  today: string,
): boolean {
  return (
    schedule.stages[stage - 1].date <= today &&
    today < schedule.callDays[0].date
  );
}

// 1..CALL_PHASE_DAYS on a call phase day, otherwise null.
function callPhaseDay(schedule: CampaignSchedule, today: string): number | null {
  const index = schedule.callDays.findIndex((day) => day.date === today);
  return index === -1 ? null : index + 1;
}

// Marks this hour's run as started. False if it already ran (or is running),
// e.g. when Vercel delivers the cron call twice.
async function claimRun(runDate: string, runHour: number): Promise<boolean> {
  const { error } = await getSupabase()
    .from("rsvp_automation_runs")
    .insert({ run_date: runDate, run_hour: runHour });
  if (!error) return true;
  if (error.code !== "23505") throw error;

  // A run that died part-way leaves finished_at empty; take it over.
  const { data, error: takeoverError } = await getSupabase()
    .from("rsvp_automation_runs")
    .update({ started_at: new Date().toISOString() })
    .eq("run_date", runDate)
    .eq("run_hour", runHour)
    .is("finished_at", null)
    .lt("started_at", new Date(Date.now() - STALE_RUN_MS).toISOString())
    .select("run_date");
  if (takeoverError) throw takeoverError;
  return data.length > 0;
}

async function finishRun(
  runDate: string,
  runHour: number,
  totals: { planned: number; sent: number; failed: number },
) {
  const { error } = await getSupabase()
    .from("rsvp_automation_runs")
    .update({ finished_at: new Date().toISOString(), ...totals })
    .eq("run_date", runDate)
    .eq("run_hour", runHour);
  if (error) console.error("Failed to record the RSVP automation run", error);
}

async function fetchEvents(today: string): Promise<EventRecord[]> {
  const { data, error } = await getSupabase()
    .from("events")
    .select("*")
    // Every step falls between T-MAX_INVITATION_DAYS_BEFORE and the red line.
    .gte("event_date", addDays(today, DEADLINE_DAYS_BEFORE))
    .lte("event_date", addDays(today, MAX_INVITATION_DAYS_BEFORE))
    .order("event_date");
  if (error) throw error;
  return (data as EventRow[])
    .map(eventFromRow)
    .filter((event) => isGuestRsvpOpen(event.phase));
}

// The guests still waiting to answer who are one step before stage.
async function fetchPendingGuests(
  eventId: string,
  stage: Stage,
): Promise<AutomationGuestRow[]> {
  const rows: AutomationGuestRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await getSupabase()
      .from("guests")
      .select(GUEST_COLUMNS)
      .eq("event_id", eventId)
      .in("rsvp_status", PENDING_STATUSES)
      .eq("rsvp_automation_stage", stage - 1)
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
      from: guest.rsvp_automation_stage,
      // One step at a time, so a guest who fell behind still gets every
      // message in order.
      to: (guest.rsvp_automation_stage + 1) as Stage,
    }));
}

// Raises the guests' stage before they're messaged. Only the IDs returned
// were still at the previous stage, i.e. not taken by an overlapping run.
async function claimGuests(
  eventId: string,
  from: number,
  to: Stage,
  guestIds: string[],
): Promise<Set<string>> {
  const claimed = new Set<string>();
  for (let i = 0; i < guestIds.length; i += ID_CHUNK_SIZE) {
    const { data, error } = await getSupabase()
      .from("guests")
      .update({ rsvp_automation_stage: to })
      .eq("event_id", eventId)
      .eq("rsvp_automation_stage", from)
      .in("id", guestIds.slice(i, i + ID_CHUNK_SIZE))
      .select("id");
    if (error) throw error;
    for (const row of data as { id: string }[]) claimed.add(row.id);
  }
  return claimed;
}

// Puts guests whose message failed back where they were, so a later run
// retries.
async function releaseGuests(
  eventId: string,
  from: number,
  to: Stage,
  guestIds: string[],
) {
  for (let i = 0; i < guestIds.length; i += ID_CHUNK_SIZE) {
    const { error } = await getSupabase()
      .from("guests")
      .update({ rsvp_automation_stage: from })
      .eq("event_id", eventId)
      .eq("rsvp_automation_stage", to)
      .in("id", guestIds.slice(i, i + ID_CHUNK_SIZE));
    if (error) console.error("Failed to release RSVP automation guests", error);
  }
}

async function sendEventMessages(
  event: EventRecord,
  sends: PlannedSend[],
  baseUrl: string,
): Promise<{ sent: number; failed: number; unconfirmed: number }> {
  let sent = 0;
  let failed = 0;
  let unconfirmed = 0;
  const steps = new Map<string, PlannedSend[]>();
  for (const send of sends) {
    const key = `${send.from}-${send.to}`;
    steps.set(key, [...(steps.get(key) ?? []), send]);
  }
  for (const batch of steps.values()) {
    const { from, to } = batch[0];
    const template = to === 1 ? rsvpTemplate() : rsvpReminderTemplate();
    if (!template) {
      failed += batch.length;
      continue;
    }

    const claimed = await claimGuests(
      event.id,
      from,
      to,
      batch.map((send) => send.guest.id),
    );
    const recipients = batch.filter((send) => claimed.has(send.guest.id));
    const sentIds: string[] = [];
    // Possibly delivered: they keep their new stage, like the sent ones.
    const unconfirmedIds: string[] = [];
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
        else if (result.reason === "unknown") {
          unconfirmedIds.push(chunk[j].guest.id);
        }
        // A number WhatsApp can't take won't work tomorrow either.
        else if (result.reason !== "invalid_number") {
          retryIds.push(chunk[j].guest.id);
        }
      });
    }

    // Stamped too, so their replies are matched and no message follows
    // within MIN_HOURS_BETWEEN_MESSAGES.
    const contactedIds = [...sentIds, ...unconfirmedIds];
    if (contactedIds.length > 0) await stampLastContacted(event.id, contactedIds);
    if (retryIds.length > 0) await releaseGuests(event.id, from, to, retryIds);
    sent += sentIds.length;
    unconfirmed += unconfirmedIds.length;
    failed += recipients.length - contactedIds.length;
  }
  return { sent, failed, unconfirmed };
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
  const { date: today, hour } = israelDateTime(now);
  const stage = stageSentAt(hour);
  const callReports = hour === CALL_REPORT_HOUR;
  if (!isAutomationHour(hour)) return { status: "idle", date: today, hour };
  if (!(await claimRun(today, hour))) {
    return { status: "already_ran", date: today, hour };
  }

  const plans: { event: EventRecord; sends: PlannedSend[] }[] = [];
  const callPhase: { event: EventRecord; day: number }[] = [];
  for (const event of await fetchEvents(today)) {
    const schedule = campaignSchedule(event.eventDate);
    if (stage !== null && isStageDue(schedule, stage, today)) {
      const sends = planSends(await fetchPendingGuests(event.id, stage), now);
      if (sends.length > 0) plans.push({ event, sends });
    }
    const day = callReports ? callPhaseDay(schedule, today) : null;
    if (day !== null) callPhase.push({ event, day });
  }

  const planned = plans.reduce((sum, plan) => sum + plan.sends.length, 0);
  let sent = 0;
  let failed = 0;
  let unconfirmed = 0;
  if (stage !== null && planned > 0) {
    await notifyAdmins(
      `${hour}:00 automation: ${planned} ${STAGE_NAMES[stage]} messages to send.`,
    );
    const baseUrl = configuredAppUrl();
    if (!baseUrl) console.error("APP_URL is not set; RSVP links can't be built");
    for (const { event, sends } of plans) {
      if (!baseUrl) {
        failed += sends.length;
        continue;
      }
      try {
        const result = await sendEventMessages(event, sends, baseUrl);
        sent += result.sent;
        failed += result.failed;
        unconfirmed += result.unconfirmed;
      } catch (error) {
        console.error(`RSVP automation failed for event ${event.id}`, error);
        failed += sends.length;
      }
    }
    await notifyAdmins(
      `Successfully sent ${sent} ${STAGE_NAMES[stage]} messages.` +
        (failed > 0 ? ` ${failed} could not be sent.` : "") +
        (unconfirmed > 0
          ? ` ${unconfirmed} were sent but WhatsApp didn't confirm them; they won't be resent.`
          : ""),
    );
  }

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

  await finishRun(today, hour, { planned, sent, failed });
  return {
    status: "done",
    date: today,
    hour,
    planned,
    sent,
    failed,
    unconfirmed,
    callPhaseEvents: reports.length,
  };
}
