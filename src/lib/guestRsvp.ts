import type { Guest } from "@/types/guest";

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

// Guests without a usable phone number can't receive digital RSVPs.
export function hasPhoneNumber(guest: Guest): boolean {
  return /\d/.test(guest.phone ?? "");
}
