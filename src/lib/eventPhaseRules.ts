import type { EventPhase } from "@/types/event";

export type CoupleSection = "guests" | "seating" | "rsvp" | "budget";

export const PHASE_ORDER: EventPhase[] = [
  "SETUP",
  "RSVP_CAMPAIGN",
  "SEATING",
  "LOCKED_PRE_EVENT",
  "LIVE",
  "POST_EVENT",
];

export const PHASE_LABELS: Record<EventPhase, string> = {
  SETUP: "הקמה",
  RSVP_CAMPAIGN: "מבצע אישורי הגעה",
  SEATING: "הושבה",
  LOCKED_PRE_EVENT: "נעילה לפני האירוע",
  LIVE: "האירוע חי",
  POST_EVENT: "אחרי האירוע",
};

export const PHASE_BADGE_CLASSES: Record<EventPhase, string> = {
  SETUP: "bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
  RSVP_CAMPAIGN:
    "bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400",
  SEATING:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400",
  LOCKED_PRE_EVENT:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  LIVE: "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
  POST_EVENT: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

// Which couple-portal tabs the couple may edit while an event sits in a given
// phase. Everything else in that phase renders read-only with a lock banner.
// An admin (god-mode) bypasses this table entirely.
const EDITABLE_SECTIONS: Record<EventPhase, CoupleSection[]> = {
  SETUP: ["guests", "seating", "rsvp", "budget"],
  RSVP_CAMPAIGN: ["budget"],
  SEATING: ["seating", "budget"],
  LOCKED_PRE_EVENT: [],
  LIVE: [],
  POST_EVENT: [],
};

export function isSectionEditableForCouple(
  phase: EventPhase,
  section: CoupleSection,
): boolean {
  return EDITABLE_SECTIONS[phase].includes(section);
}

export const PHASE_LOCK_MESSAGES: Record<EventPhase, string> = {
  SETUP: "",
  RSVP_CAMPAIGN:
    "מבצע אישורי הגעה בעיצומו - רשימת המוזמנים נעולה לעריכה. הסוכנות מבצעת כעת שיחות וגלי SMS לאישור הגעה.",
  SEATING:
    "רשימת המוזמנים נעולה לאחר סיום מבצע אישורי ההגעה. ניתן להמשיך ולערוך את סידורי ההושבה.",
  LOCKED_PRE_EVENT:
    "האירוע ננעל 48 שעות לפני המועד - צפייה בלבד. לשינויים יש לפנות לסוכנות.",
  LIVE: "האירוע מתקיים כעת - צפייה בלבד. הדיילות מנהלות את קבלת האורחים באולם.",
  POST_EVENT: "האירוע הסתיים - צפייה בלבד.",
};
