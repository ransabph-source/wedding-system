import { guestFromRow, guestToRow } from "@/lib/db/mappers";
import { createCollectionHandlers, jsonError } from "@/lib/db/routeHelpers";
import { getSupabase } from "@/lib/supabase/server";

const MAX_WALK_IN_PARTY_SIZE = 30;
const MAX_WALK_IN_NAME_LENGTH = 100;

// Hostesses may add walk-in guests on the live screen. They only choose the
// name, party size, group, phone and table; everything else is forced: a
// walk-in has confirmed, arrived, and was never contacted or seated in a zone.
async function prepareWalkInGuests(
  eventId: string,
  rows: Record<string, unknown>[],
): Promise<Record<string, unknown>[] | Response> {
  const prepared: Record<string, unknown>[] = [];

  for (const row of rows) {
    const name = typeof row.name === "string" ? row.name.trim() : "";
    const partySize = row.party_size;
    if (!name || name.length > MAX_WALK_IN_NAME_LENGTH) {
      return jsonError("A walk-in guest needs a name", 400);
    }
    if (
      typeof partySize !== "number" ||
      !Number.isInteger(partySize) ||
      partySize < 1 ||
      partySize > MAX_WALK_IN_PARTY_SIZE
    ) {
      return jsonError(
        `Party size must be between 1 and ${MAX_WALK_IN_PARTY_SIZE}`,
        400,
      );
    }
    const tableId = typeof row.table_id === "string" ? row.table_id : null;

    prepared.push({
      event_id: eventId,
      id: row.id,
      name,
      phone: typeof row.phone === "string" ? row.phone.slice(0, 30) : "",
      group_name:
        typeof row.group_name === "string" ? row.group_name.slice(0, 50) : "",
      party_size: partySize,
      confirmed_count: partySize,
      rsvp_status: "confirmed",
      table_id: tableId,
      zone_id: null,
      arrived: true,
      arrived_count: null,
      contact_count: 0,
    });
  }

  const refused = await checkSeatingBelongsToEvent(eventId, prepared);
  if (refused) return refused;
  return prepared;
}

// Staff may only seat guests at the event's own tables and zones.
async function checkSeatingBelongsToEvent(
  eventId: string,
  rows: Record<string, unknown>[],
): Promise<Response | null> {
  for (const [column, table] of [
    ["table_id", "seating_tables"],
    ["zone_id", "seating_zones"],
  ] as const) {
    const ids = new Set(
      rows
        .map((row) => row[column])
        .filter((id): id is string => typeof id === "string"),
    );
    if (ids.size === 0) continue;
    const { data, error } = await getSupabase()
      .from(table)
      .select("id")
      .eq("event_id", eventId)
      .in("id", [...ids]);
    if (error) throw error;
    if (data.length !== ids.size) {
      return jsonError(`Unknown ${column} for this event`, 400);
    }
  }
  return null;
}

export const { GET, POST, PUT, DELETE } = createCollectionHandlers({
  table: "guests",
  fromRow: guestFromRow,
  toRow: guestToRow,
  // Hostesses mark arrivals and move guests between tables on the live screen.
  staffWritableColumns: ["arrived", "arrived_count", "table_id", "zone_id"],
  validateStaffUpdate: checkSeatingBelongsToEvent,
  prepareStaffInsert: prepareWalkInGuests,
  coupleSection: "guests",
  coupleColumnSections: {
    table_id: "seating",
    zone_id: "seating",
    rsvp_status: "rsvp",
    confirmed_count: "rsvp",
    contact_count: "rsvp",
  },
});
