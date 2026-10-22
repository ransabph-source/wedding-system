import "server-only";
import { flags, HDate, HebrewCalendar } from "@hebcal/core";

// Days the automation must not run (no guest messages, no admin reports):
// Fridays, Saturdays, Jewish holidays (yom tov, on the Israeli schedule, Yom
// Kippur included), the day before each one (erev chag), Yom HaShoah and Yom
// HaZikaron. Chol HaMoed and minor holidays aren't rest days. Dates are
// Israel dates as YYYY-MM-DD (see israelDate).

const FRIDAY = 5;
const SATURDAY = 6;
// Hebcal's names for the memorial days, already moved off Fridays,
// Saturdays and Sundays as Israel observes them.
const MEMORIAL_DAYS = new Set(["Yom HaShoah", "Yom HaZikaron"]);

function holidaysOn(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  // HDate reads a Date's local fields, so this is the same day in any zone.
  const hdate = new HDate(new Date(year, month - 1, day));
  return HebrewCalendar.getHolidaysOnDate(hdate, true) ?? [];
}

function isYomTov(date: string): boolean {
  return holidaysOn(date).some((event) => (event.getFlags() & flags.CHAG) !== 0);
}

function isMemorialDay(date: string): boolean {
  return holidaysOn(date).some((event) => MEMORIAL_DAYS.has(event.getDesc()));
}

function addDay(date: string): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + 86_400_000)
    .toISOString()
    .slice(0, 10);
}

export function isRestDay(date: string): boolean {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  if (weekday === FRIDAY || weekday === SATURDAY) return true;
  return isYomTov(date) || isYomTov(addDay(date)) || isMemorialDay(date);
}

// The first day on or after date that isn't a rest day.
export function nextWorkingDay(date: string): string {
  while (isRestDay(date)) date = addDay(date);
  return date;
}
