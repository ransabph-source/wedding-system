import type { Guest } from "@/types/guest";

// The most seats a guest can confirm from their RSVP link. Guests may confirm
// more than their invited party size, up to this sanity limit.
export const MAX_RSVP_COUNT = 10;

export function getConfirmedCount(guest: Guest): number {
  if (guest.rsvpStatus !== "confirmed") return 0;
  return Math.min(guest.confirmedCount ?? guest.partySize, guest.partySize);
}

export function getRsvpFractionClasses(guest: Guest): string {
  const confirmed = getConfirmedCount(guest);
  if (guest.rsvpStatus === "declined" || confirmed === 0) {
    return "bg-rose-50 text-rose-700 ring-rose-600/15 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-400/20";
  }
  if (confirmed >= guest.partySize) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20";
  }
  return "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/20";
}

export function getArrivedCount(guest: Guest): number {
  if (!guest.arrived) return 0;
  return guest.arrivedCount ?? guest.partySize;
}

// Digits only, with an Israeli +972 prefix folded back to a leading 0 so
// "+972-50-1234567" and "050-1234567" compare equal.
export function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("972") ? `0${digits.slice(3)}` : digits;
}

// No guest gets another RSVP message within this many hours of the last one
// (sent, or possibly delivered without WhatsApp confirming), whether the
// automation or an admin sends it. Less than the 3 days between automation
// steps, so cron timing jitter never skips one.
export const MIN_HOURS_BETWEEN_MESSAGES = 36;

export function wasRecentlyMessaged(
  lastContactedAt: string | null | undefined,
  now: number,
): boolean {
  if (!lastContactedAt) return false;
  return (
    now - Date.parse(lastContactedAt) < MIN_HOURS_BETWEEN_MESSAGES * 3_600_000
  );
}

// Guests without a usable phone number can't receive digital RSVPs.
export function hasPhoneNumber(guest: Guest): boolean {
  return /\d/.test(guest.phone ?? "");
}
