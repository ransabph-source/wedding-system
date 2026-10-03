const ONES = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
const TENS = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];
const HUNDREDS = ["", "ק", "ר", "ש", "ת"];

const GERESH = "׳";
const GERSHAYIM = "״";

// Writes 1-999 in Hebrew letters (gematria), e.g. 9 → ט׳, 15 → ט״ו,
// 787 → תשפ״ז. Thousands are dropped, as is customary for years.
export function toHebrewNumeral(value: number): string {
  let n = Math.floor(value) % 1000;
  if (n <= 0) return "";

  let letters = "";
  while (n >= 400) {
    letters += "ת";
    n -= 400;
  }
  letters += HUNDREDS[Math.floor(n / 100)];
  n %= 100;
  // 15 and 16 are written ט״ו / ט״ז so they don't spell a divine name.
  if (n === 15 || n === 16) {
    letters += "ט" + ONES[n - 9];
  } else {
    letters += TENS[Math.floor(n / 10)] + ONES[n % 10];
  }

  return letters.length === 1
    ? letters + GERESH
    : letters.slice(0, -1) + GERSHAYIM + letters.slice(-1);
}

const hebrewCalendarFormat = new Intl.DateTimeFormat("he-IL-u-ca-hebrew", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

// Traditional Hebrew date, e.g. "ט׳ בחשוון תשפ״ז". The calendar maths
// (including leap-year Adar I/II) comes from Intl; only the numbers are
// converted to letters.
export function formatHebrewDate(date: Date): string {
  const parts = hebrewCalendarFormat.formatToParts(date);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const year = Number(parts.find((part) => part.type === "year")?.value);
  if (!day || !month || !year) return hebrewCalendarFormat.format(date);
  return `${toHebrewNumeral(day)} ב${month} ${toHebrewNumeral(year)}`;
}
