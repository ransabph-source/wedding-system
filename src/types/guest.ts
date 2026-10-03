export type SeatingAssignment =
  | { kind: "table"; id: string }
  | { kind: "zone"; id: string };

export type RsvpStatus =
  | "pending_whatsapp"
  | "needs_call"
  | "confirmed"
  | "declined";

export interface Guest {
  id: string;
  name: string;
  phone: string;
  group: string;
  partySize: number;
  // How many of the party confirmed attendance. Only meaningful when
  // rsvpStatus is "confirmed"; when unset, the whole party is assumed.
  confirmedCount?: number;
  seatingAssignment: SeatingAssignment | null;
  arrived: boolean;
  // How many of the party actually showed up, when recorded at check-in;
  // when unset on an arrived guest, the whole party is assumed.
  arrivedCount?: number;
  rsvpStatus: RsvpStatus;
  contactCount: number;
}
