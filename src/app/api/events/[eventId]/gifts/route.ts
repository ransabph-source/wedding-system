import { giftFromRow, giftToRow } from "@/lib/db/mappers";
import { createCollectionHandlers } from "@/lib/db/routeHelpers";

// The couple's gift ledger. Private to the couple and admins: hostesses, who
// may view every event's guests, can neither read nor change it.
export const { GET, POST, PUT, DELETE } = createCollectionHandlers({
  table: "gifts",
  fromRow: giftFromRow,
  toRow: giftToRow,
  staffCanRead: false,
  coupleSection: "gifts",
});
