import type { SeatingTable } from "@/types/seating";

export const DEFAULT_TABLES: SeatingTable[] = [
  { id: "table-1", name: "שולחן 1", capacity: 12, shape: "round", isReserved: false },
  { id: "table-2", name: "שולחן 2", capacity: 12, shape: "round", isReserved: false },
  { id: "table-3", name: "שולחן 3", capacity: 12, shape: "square", isReserved: false },
  { id: "table-4", name: "שולחן 4", capacity: 12, shape: "square", isReserved: false },
];
