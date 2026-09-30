export type EventPhase =
  | "SETUP"
  | "RSVP_CAMPAIGN"
  | "SEATING"
  | "LOCKED_PRE_EVENT"
  | "LIVE"
  | "POST_EVENT";

export type UserRole = "admin" | "couple" | "hostess" | null;
