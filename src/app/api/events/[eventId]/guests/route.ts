import { guestFromRow, guestToRow } from "@/lib/db/mappers";
import { createCollectionHandlers } from "@/lib/db/routeHelpers";

export const { GET, POST, PUT, DELETE } = createCollectionHandlers({
  table: "guests",
  fromRow: guestFromRow,
  toRow: guestToRow,
  // Hostesses mark arrivals on the live screen.
  staffWritableColumns: ["arrived", "arrived_count"],
  coupleSection: "guests",
  coupleColumnSections: {
    table_id: "seating",
    zone_id: "seating",
    rsvp_status: "rsvp",
    confirmed_count: "rsvp",
    contact_count: "rsvp",
  },
});
