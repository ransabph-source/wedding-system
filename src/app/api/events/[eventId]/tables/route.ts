import { tableFromRow, tableToRow } from "@/lib/db/mappers";
import { createCollectionHandlers } from "@/lib/db/routeHelpers";

export const { GET, POST, PUT, DELETE } = createCollectionHandlers({
  table: "seating_tables",
  fromRow: tableFromRow,
  toRow: tableToRow,
  coupleSection: "seating",
});
