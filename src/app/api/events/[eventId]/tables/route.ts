import { tableFromRow, tableToRow } from "@/lib/db/mappers";
import { createCollectionHandlers } from "@/lib/db/routeHelpers";

// Table structure (adding, removing, capacity, names) is managed by admins.
// Couples only seat guests at existing tables, which goes through the guests
// route; the guests' table foreign key keeps them to this event's tables.
export const { GET, POST, PUT, DELETE } = createCollectionHandlers({
  table: "seating_tables",
  fromRow: tableFromRow,
  toRow: tableToRow,
  coupleSection: "seating",
  adminOnlyWrites: true,
});
