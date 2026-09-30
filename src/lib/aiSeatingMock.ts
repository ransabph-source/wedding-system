import type { Guest } from "@/types/guest";
import type { SeatingTable } from "@/types/seating";

export interface AiSeatingAssignment {
  guestId: string;
  tableId: string;
}

export interface AiSeatingResult {
  assignments: AiSeatingAssignment[];
  unassignedGuestIds: string[];
  tablesUsed: number;
  overbookAllowance: number;
  // Guests placed at a table outside their own category because every
  // same-category / fresh table was full (rule: leftover pass only).
  mixedTableGuestCount: number;
}

// Keywords that hint the user is asking the "AI" to squeeze in extra
// chairs beyond a table's stated capacity. This is a deliberately simple
// mock of prompt-driven behavior, not real language understanding.
const OVERBOOK_SIGNAL_WORDS = ["עוד", "כיסא", "מעל", "אקסטרה"];

/**
 * Reads the free-text instructions and decides how many guests past a
 * table's normal capacity the mock "AI" is allowed to seat there.
 */
export function getOverbookAllowance(instructions: string): number {
  const text = instructions.trim();
  if (!text) return 0;

  const hasWordSignal = OVERBOOK_SIGNAL_WORDS.some((word) =>
    text.includes(word),
  );
  const hasTwoSignal = /\b2\b/.test(text);
  const hasOneSignal = /\b1\b/.test(text);

  if (!hasWordSignal && !hasTwoSignal && !hasOneSignal) return 0;
  return hasTwoSignal ? 2 : 1;
}

/**
 * Finds the tightest-fitting table for a required number of seats
 * (best-fit: the smallest remaining capacity that still fits). This is
 * what makes gap-filling work: a table with only 1-2 seats left is
 * always preferred over an empty/fresh table whenever a small enough
 * party is being placed, so small parties naturally plug small gaps
 * instead of triggering a new table.
 */
export function findBestTable(
  tables: SeatingTable[],
  remainingCapacity: Map<string, number>,
  requiredCapacity: number,
  preferredTableId?: string,
): string | null {
  if (preferredTableId && tables.some((t) => t.id === preferredTableId)) {
    const preferredRemaining = remainingCapacity.get(preferredTableId) ?? 0;
    if (preferredRemaining >= requiredCapacity) return preferredTableId;
  }

  let bestTableId: string | null = null;
  let bestRemaining = Infinity;

  for (const table of tables) {
    const remaining = remainingCapacity.get(table.id) ?? 0;
    if (remaining >= requiredCapacity && remaining < bestRemaining) {
      bestTableId = table.id;
      bestRemaining = remaining;
    }
  }

  return bestTableId;
}

/**
 * Very rough "last name" detector: everything after the first word of the
 * guest's name. Used only to cluster likely family members together; it's
 * a heuristic, not a real name parser.
 */
export function extractLastName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length > 1 ? parts.slice(1).join(" ") : "";
}

/**
 * Groups guests within a category into "units" that should ideally sit
 * together: guests sharing a detected last name form one unit, everyone
 * else is their own solo unit.
 */
function buildFamilyUnits(guests: Guest[]): Guest[][] {
  const unitsByKey = new Map<string, Guest[]>();

  for (const guest of guests) {
    const lastName = extractLastName(guest.name);
    const key = lastName || `__solo__${guest.id}`;
    if (!unitsByKey.has(key)) unitsByKey.set(key, []);
    unitsByKey.get(key)!.push(guest);
  }

  return [...unitsByKey.values()];
}

/**
 * Reads which category (if any) already "owns" each table, based on
 * guests already seated there. A table with guests from more than one
 * category is treated as already mixed (fair game for the leftover
 * pass only); an empty table is left unset ("fresh").
 */
function buildInitialTableCategoryMap(
  tables: SeatingTable[],
  allGuests: Guest[],
): Map<string, string | null> {
  const map = new Map<string, string | null>();

  for (const table of tables) {
    const occupantCategories = new Set(
      allGuests
        .filter(
          (guest) =>
            guest.seatingAssignment?.kind === "table" &&
            guest.seatingAssignment.id === table.id,
        )
        .map((guest) => guest.category || "ללא קטגוריה"),
    );

    if (occupantCategories.size === 1) {
      map.set(table.id, [...occupantCategories][0]);
    } else if (occupantCategories.size > 1) {
      map.set(table.id, null);
    }
    // Fresh/empty tables are left unset; Map#get returns undefined for them.
  }

  return map;
}

/**
 * Mock "AI" seating planner, built as a small heuristic engine:
 *
 * 1. Strict party grouping - a guest record's partySize is always seated
 *    as one atomic block on a single table; it is never split.
 * 2. Category cohesion - a table is claimed by the first category seated
 *    there and stays exclusive to it, unless every same-category/fresh
 *    table is full, in which case a final leftover pass allows mixing.
 * 3. Smart gap filling - within a category, parties are placed largest
 *    first using best-fit table selection, so a party of 1-2 naturally
 *    lands on a table with exactly 1-2 seats left instead of opening a
 *    new table.
 * 4. Family clustering - guests who share a detected last name are
 *    grouped into one unit and seated together at a single table
 *    whenever a table has room for the whole unit.
 */
export function generateMockSeatingPlan(
  unseatedGuests: Guest[],
  tables: SeatingTable[],
  allGuests: Guest[],
  instructions = "",
): AiSeatingResult {
  const overbookAllowance = getOverbookAllowance(instructions);
  const availableTables = tables.filter((table) => !table.isReserved);

  const remainingCapacity = new Map<string, number>();
  for (const table of availableTables) {
    const occupied = allGuests
      .filter(
        (guest) =>
          guest.seatingAssignment?.kind === "table" &&
          guest.seatingAssignment.id === table.id,
      )
      .reduce((sum, guest) => sum + guest.partySize, 0);
    remainingCapacity.set(
      table.id,
      table.capacity + overbookAllowance - occupied,
    );
  }

  const tableCategory = buildInitialTableCategoryMap(
    availableTables,
    allGuests,
  );

  const categories = new Map<string, Guest[]>();
  for (const guest of unseatedGuests) {
    const key = guest.category || "ללא קטגוריה";
    if (!categories.has(key)) categories.set(key, []);
    categories.get(key)!.push(guest);
  }

  const assignments: AiSeatingAssignment[] = [];
  const leftoverGuests: Guest[] = [];

  for (const [category, categoryGuests] of categories) {
    const eligibleTables = availableTables.filter((table) => {
      const owner = tableCategory.get(table.id);
      return owner === undefined || owner === category;
    });

    const units = buildFamilyUnits(categoryGuests)
      .map((members) => ({
        members: [...members].sort((a, b) => b.partySize - a.partySize),
        totalSize: members.reduce((sum, member) => sum + member.partySize, 0),
      }))
      .sort((a, b) => b.totalSize - a.totalSize);

    for (const unit of units) {
      // Rule 4: try to seat the whole family unit together at one table.
      const wholeUnitTableId = findBestTable(
        eligibleTables,
        remainingCapacity,
        unit.totalSize,
      );

      if (wholeUnitTableId) {
        for (const member of unit.members) {
          assignments.push({ guestId: member.id, tableId: wholeUnitTableId });
        }
        remainingCapacity.set(
          wholeUnitTableId,
          (remainingCapacity.get(wholeUnitTableId) ?? 0) - unit.totalSize,
        );
        if (tableCategory.get(wholeUnitTableId) === undefined) {
          tableCategory.set(wholeUnitTableId, category);
        }
        continue;
      }

      // No single table fits the whole family - seat members individually,
      // still preferring to keep them near each other when possible.
      let preferredTableId: string | undefined;
      for (const member of unit.members) {
        const tableId = findBestTable(
          eligibleTables,
          remainingCapacity,
          member.partySize,
          preferredTableId,
        );

        if (tableId) {
          assignments.push({ guestId: member.id, tableId });
          remainingCapacity.set(
            tableId,
            (remainingCapacity.get(tableId) ?? 0) - member.partySize,
          );
          if (tableCategory.get(tableId) === undefined) {
            tableCategory.set(tableId, category);
          }
          preferredTableId = tableId;
        } else {
          leftoverGuests.push(member);
        }
      }
    }
  }

  // Final leftover pass: only guests who found no room in their own
  // category get placed on a mixed table, largest parties first.
  const unassignedGuestIds: string[] = [];
  let mixedTableGuestCount = 0;
  const sortedLeftover = [...leftoverGuests].sort(
    (a, b) => b.partySize - a.partySize,
  );

  for (const guest of sortedLeftover) {
    const tableId = findBestTable(
      availableTables,
      remainingCapacity,
      guest.partySize,
    );

    if (tableId) {
      assignments.push({ guestId: guest.id, tableId });
      remainingCapacity.set(
        tableId,
        (remainingCapacity.get(tableId) ?? 0) - guest.partySize,
      );
      if (tableCategory.get(tableId) !== guest.category) {
        tableCategory.set(tableId, null);
      }
      mixedTableGuestCount += 1;
    } else {
      unassignedGuestIds.push(guest.id);
    }
  }

  const usedTableIds = new Set(assignments.map((a) => a.tableId));

  return {
    assignments,
    unassignedGuestIds,
    tablesUsed: usedTableIds.size,
    overbookAllowance,
    mixedTableGuestCount,
  };
}
