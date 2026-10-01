import type { EventRecord } from "@/types/event";

// A row in the admin CRM: a couple's account with its events, or an event
// that has no couple account (e.g. legacy mock data created before accounts).
export interface ClientAccount {
  // Unique per row: the user ID, or "event:<id>" for an event with no account.
  key: string;
  // The Supabase Auth user ID, or null for an event with no account.
  userId: string | null;
  // Undefined if there's no account, or the Auth user is missing.
  email: string | undefined;
  coupleNames: string;
  createdAt: string;
  // Usually one; empty if the event was deleted separately.
  events: EventRecord[];
}
