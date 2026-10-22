import "server-only";
import { nextWorkingDay } from "@/lib/restDays";

// The RSVP automation's timeline for one event (see lib/rsvpAutomation),
// shared by the cron job and the admin's timeline view. Six steps, all on
// working days (see lib/restDays):
//
//   1. invitation        T-24, sent at 10:00 Israel time
//   2. first reminder    3 days later, at 15:00
//   3. second reminder   3 days later, at 18:00
//   4-6. call phase      3 days later, then the next 2 working days; the
//                        admins get each day's report at 10:00
//
// A step due on a rest day moves to the next working day and every later
// step moves with it. The last call day must still be no later than T-7 (the
// red line), so when the rest days push it past that, the whole timeline
// starts a day earlier, and again, until it fits.

const TIME_ZONE = "Asia/Jerusalem";
const DAY_MS = 86_400_000;
const INVITATION_DAYS_BEFORE = 24;
export const DEADLINE_DAYS_BEFORE = 7;
// Between the invitation, the reminders and the first call day.
const DAYS_BETWEEN_STEPS = 3;
export const CALL_PHASE_DAYS = 3;
// No calendar has enough rest days to need more; see campaignSchedule.
export const MAX_INVITATION_DAYS_BEFORE = 60;

// The Israel hour each message goes out at; call phase reports go out at
// CALL_REPORT_HOUR.
export const STAGE_SEND_HOURS = { 1: 10, 2: 15, 3: 18 } as const;
export const CALL_REPORT_HOUR = 10;

export type Stage = keyof typeof STAGE_SEND_HOURS;

export interface Milestone {
  date: string;
  // Due on a rest day and moved to the next working day.
  shifted: boolean;
}

export interface CampaignSchedule {
  // Invitation, first and second reminder.
  stages: [Milestone, Milestone, Milestone];
  callDays: [Milestone, Milestone, Milestone];
  // How many days before the event the timeline starts: INVITATION_DAYS_BEFORE,
  // or more when it had to start earlier to finish by the red line.
  startDaysBefore: number;
  // The last day the call phase may end on (T-7).
  deadline: string;
}

// Israel's date as YYYY-MM-DD and hour (0-23), daylight saving included.
export function israelDateTime(now: Date): { date: string; hour: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
  };
}

export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

// The six steps starting from start, each moved past any rest day it falls on.
function scheduleFrom(start: string): Milestone[] {
  const steps: Milestone[] = [];
  let due = start;
  for (let step = 0; step < 3 + CALL_PHASE_DAYS; step++) {
    const date = nextWorkingDay(due);
    steps.push({ date, shifted: date !== due });
    // Call days follow each other; the steps before them are spaced out.
    due = addDays(date, step < 3 ? DAYS_BETWEEN_STEPS : 1);
  }
  return steps;
}

export function campaignSchedule(eventDate: string): CampaignSchedule {
  const deadline = addDays(eventDate, -DEADLINE_DAYS_BEFORE);
  // Starting earlier never moves a step later, so the first start that fits
  // is the latest one that does.
  for (
    let daysBefore = INVITATION_DAYS_BEFORE;
    daysBefore <= MAX_INVITATION_DAYS_BEFORE;
    daysBefore++
  ) {
    const steps = scheduleFrom(addDays(eventDate, -daysBefore));
    if (steps[steps.length - 1].date <= deadline) {
      return {
        stages: steps.slice(0, 3) as CampaignSchedule["stages"],
        callDays: steps.slice(3) as CampaignSchedule["callDays"],
        startDaysBefore: daysBefore,
        deadline,
      };
    }
  }
  throw new Error(`No RSVP timeline fits before the red line for ${eventDate}`);
}
