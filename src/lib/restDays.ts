import "server-only";
import { flags, HDate, HebrewCalendar } from "@hebcal/core";

// Days the automation must not message guests: Fridays, Saturdays, Jewish
// holidays (yom tov, on the Israeli schedule, Yom Kippur included) and the
// day before each one (erev chag). Chol HaMoed and minor holidays aren't
// rest days. Dates are Israel dates as YYYY-MM-DD (see israelDate).

const FRIDAY = 5;
const SATURDAY = 6;

function isYomTov(date: string): boolean {
  const [year, month, day] = date.split("-").map(Number);
  // HDate reads a Date's local fields, so this is the same day in any zone.
  const hdate = new HDate(new Date(year, month - 1, day));
  return (HebrewCalendar.getHolidaysOnDate(hdate, true) ?? []).some(
    (event) => (event.getFlags() & flags.CHAG) !== 0,
  );
}

function nextDay(date: string): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + 86_400_000)
    .toISOString()
    .slice(0, 10);
}

export function isRestDay(date: string): boolean {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  if (weekday === FRIDAY || weekday === SATURDAY) return true;
  return isYomTov(date) || isYomTov(nextDay(date));
}
