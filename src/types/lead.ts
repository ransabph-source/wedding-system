// In pipeline order. Stored as these codes; the UI shows Hebrew labels.
// closed = the lead was converted into an event.
export const LEAD_STATUSES = [
  "new",
  "contacted",
  "proposal_sent",
  "won",
  "closed",
  "lost",
] as const;

// Notes are a running log of calls, so allow plenty of room.
export const MAX_NOTES_LENGTH = 20000;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export interface Lead {
  id: string;
  names: string;
  phone: string;
  eventType: string;
  status: LeadStatus;
  // YYYY-MM-DD, or null if no follow-up is scheduled.
  followUpDate: string | null;
  notes: string;
  createdAt: string;
}

// The fields an admin edits; id and createdAt are set by the database.
export type LeadInput = Omit<Lead, "id" | "createdAt">;
