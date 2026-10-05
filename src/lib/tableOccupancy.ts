import { getArrivedCount } from "@/lib/guestRsvp";
import type { Guest } from "@/types/guest";
import type { SeatingTable } from "@/types/seating";

export interface TableOccupancy {
  table: SeatingTable;
  guests: Guest[];
  // Seats taken by the parties assigned here, counted the same way as the
  // seating screen's table cards.
  seated: number;
  arrived: number;
  // Negative when the table is over capacity.
  freeSeats: number;
}

// Numbered tables in numeric order ("2" before "10"), then named ones.
export function compareTables(a: SeatingTable, b: SeatingTable): number {
  const aNumber = Number(a.name.replace(/\D/g, "")) || Infinity;
  const bNumber = Number(b.name.replace(/\D/g, "")) || Infinity;
  if (aNumber !== bNumber) return aNumber - bNumber;
  return a.name.localeCompare(b.name, "he");
}

export function getTableOccupancy(
  tables: SeatingTable[],
  guests: Guest[],
): TableOccupancy[] {
  const guestsByTable = new Map<string, Guest[]>();
  for (const guest of guests) {
    if (guest.seatingAssignment?.kind !== "table") continue;
    const list = guestsByTable.get(guest.seatingAssignment.id) ?? [];
    list.push(guest);
    guestsByTable.set(guest.seatingAssignment.id, list);
  }

  return [...tables].sort(compareTables).map((table) => {
    const tableGuests = (guestsByTable.get(table.id) ?? []).sort((a, b) =>
      a.name.localeCompare(b.name, "he"),
    );
    const seated = tableGuests.reduce((sum, guest) => sum + guest.partySize, 0);
    return {
      table,
      guests: tableGuests,
      seated,
      arrived: tableGuests.reduce(
        (sum, guest) => sum + getArrivedCount(guest),
        0,
      ),
      freeSeats: table.capacity - seated,
    };
  });
}
