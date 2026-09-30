export interface SeatingTable {
  id: string;
  name: string;
  capacity: number;
  shape: "round" | "square";
  isReserved: boolean;
}

export interface SeatingZone {
  id: string;
  name: string;
  tableIds: string[];
}
