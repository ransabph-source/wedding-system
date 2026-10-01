export type EventPhase =
  | "SETUP"
  | "RSVP_CAMPAIGN"
  | "SEATING"
  | "LOCKED_PRE_EVENT"
  | "LIVE"
  | "POST_EVENT";

// The signed-in user's role, or null when signed out.
export type UserRole = "admin" | "couple" | "staff" | null;

export interface EventRecord {
  id: string;
  coupleNames: string;
  eventDate: string;
  venue: string;
  // Contact phone; empty if unknown.
  phone: string;
  guestsInvited: number;
  status: "planning" | "confirmed" | "completed";
  phase: EventPhase;
}
