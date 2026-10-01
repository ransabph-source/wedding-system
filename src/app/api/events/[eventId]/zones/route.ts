import { zoneFromRow, zoneToRow } from "@/lib/db/mappers";
import { createCollectionHandlers } from "@/lib/db/routeHelpers";

export const { GET, POST, PUT, DELETE } = createCollectionHandlers({
  table: "seating_zones",
  fromRow: zoneFromRow,
  toRow: zoneToRow,
  coupleSection: "seating",
});
