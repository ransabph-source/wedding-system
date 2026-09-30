import type { EventPhase } from "@/types/event";

export interface EventRecord {
  id: string;
  coupleNames: string;
  eventDate: string;
  venue: string;
  guestsInvited: number;
  status: "planning" | "confirmed" | "completed";
  phase: EventPhase;
}

export const MOCK_EVENTS: EventRecord[] = [
  {
    id: "mock-1",
    coupleNames: "דניאל ותמר כהן",
    eventDate: "2026-11-12",
    venue: "אולמי הגן הגדול",
    guestsInvited: 220,
    status: "planning",
    phase: "SETUP",
  },
  {
    id: "2",
    coupleNames: "עידו ונועה לוי",
    eventDate: "2026-10-03",
    venue: "צימר הכרם",
    guestsInvited: 120,
    status: "confirmed",
    phase: "RSVP_CAMPAIGN",
  },
  {
    id: "3",
    coupleNames: "יובל ומאיה ברק",
    eventDate: "2026-09-28",
    venue: "מלון דן תל אביב",
    guestsInvited: 300,
    status: "confirmed",
    phase: "SEATING",
  },
];

export function getEventById(id: string): EventRecord | undefined {
  return MOCK_EVENTS.find((event) => event.id === id);
}
