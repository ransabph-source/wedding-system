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

// A table's number, from either a bare "5" or an older "שולחן 5" name.
// Custom names like "שולחן ההורים" have no number.
const NUMBERED_TABLE_NAME = /^(\s*(?:שולחן\s*)?)(\d+)(\s*)$/;

/**
 * Closes the gap left by deleting a numbered table: every numbered table
 * after it moves down by one, so 1, 3, 4 becomes 1, 2, 3. Only names change;
 * IDs stay put, so guests seated at a renumbered table stay seated there.
 * Untouched tables are returned as-is so only the renamed ones get saved.
 */
export function renumberTablesAfterDelete(
  remainingTables: SeatingTable[],
  deletedTable: Pick<SeatingTable, "name">,
): SeatingTable[] {
  const deletedMatch = NUMBERED_TABLE_NAME.exec(deletedTable.name);
  if (!deletedMatch) return remainingTables;
  const deletedNumber = Number(deletedMatch[2]);

  return remainingTables.map((table) => {
    const match = NUMBERED_TABLE_NAME.exec(table.name);
    if (!match || Number(match[2]) <= deletedNumber) return table;
    const [, prefix, number, suffix] = match;
    return { ...table, name: `${prefix}${Number(number) - 1}${suffix}` };
  });
}
