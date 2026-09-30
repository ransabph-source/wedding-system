import type { SeatingTable } from "@/types/seating";

/**
 * Bulk-created tables are stored with a bare number as their name (e.g. "5"),
 * while manually named tables (e.g. "שולחן ההורים") keep whatever the user
 * typed. This renders both consistently for display.
 */
export function formatTableLabel(table: Pick<SeatingTable, "name">): string {
  const trimmed = table.name.trim();
  return /^\d+$/.test(trimmed) ? `שולחן ${trimmed}` : table.name;
}

/**
 * Finds the next sequential table number by looking at the highest digit
 * sequence found across existing table names (covers both bare numbers and
 * older "שולחן N" style names).
 */
export function getNextTableNumber(tables: SeatingTable[]): number {
  const numbers = tables
    .map((table) => Number(table.name.replace(/\D/g, "")))
    .filter((n) => Number.isFinite(n) && n > 0);
  return numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
}
