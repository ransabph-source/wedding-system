// Converts between the app's camelCase models and the snake_case database
// rows. Absent optional fields are stored as null and read back as undefined.
import type { EventRecord } from "@/types/event";
import type { Gift } from "@/types/gift";
import type { Guest } from "@/types/guest";
import type { Lead, LeadInput } from "@/types/lead";
import type { SeatingTable, SeatingZone } from "@/types/seating";

export interface EventRow {
  id: string;
  couple_names: string;
  event_date: string;
  venue: string;
  phone: string;
  guests_invited: number;
  status: EventRecord["status"];
  phase: EventRecord["phase"];
}

export interface GuestRow {
  event_id: string;
  id: string;
  name: string;
  phone: string;
  group_name: string;
  party_size: number;
  confirmed_count: number | null;
  rsvp_status: Guest["rsvpStatus"];
  table_id: string | null;
  zone_id: string | null;
  arrived: boolean;
  arrived_count: number | null;
  contact_count: number;
}

export interface SeatingTableRow {
  event_id: string;
  id: string;
  name: string;
  capacity: number;
  shape: SeatingTable["shape"];
  is_reserved: boolean;
}

export interface SeatingZoneRow {
  event_id: string;
  id: string;
  name: string;
  table_ids: string[];
}

export function eventFromRow(row: EventRow): EventRecord {
  return {
    id: row.id,
    coupleNames: row.couple_names,
    eventDate: row.event_date,
    venue: row.venue,
    phone: row.phone,
    guestsInvited: row.guests_invited,
    status: row.status,
    phase: row.phase,
  };
}

// Only maps the fields present, so it serves both inserts and partial updates.
export function eventToRow(event: Partial<EventRecord>): Partial<EventRow> {
  const row: Partial<EventRow> = {};
  if (event.id !== undefined) row.id = event.id;
  if (event.coupleNames !== undefined) row.couple_names = event.coupleNames;
  if (event.eventDate !== undefined) row.event_date = event.eventDate;
  if (event.venue !== undefined) row.venue = event.venue;
  if (event.phone !== undefined) row.phone = event.phone;
  if (event.guestsInvited !== undefined) row.guests_invited = event.guestsInvited;
  if (event.status !== undefined) row.status = event.status;
  if (event.phase !== undefined) row.phase = event.phase;
  return row;
}

export function guestFromRow(row: GuestRow): Guest {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    group: row.group_name,
    partySize: row.party_size,
    confirmedCount: row.confirmed_count ?? undefined,
    seatingAssignment: row.table_id
      ? { kind: "table", id: row.table_id }
      : row.zone_id
        ? { kind: "zone", id: row.zone_id }
        : null,
    arrived: row.arrived,
    arrivedCount: row.arrived_count ?? undefined,
    rsvpStatus: row.rsvp_status,
    contactCount: row.contact_count,
  };
}

export function guestToRow(eventId: string, guest: Guest): GuestRow {
  const seat = guest.seatingAssignment;
  return {
    event_id: eventId,
    id: guest.id,
    name: guest.name,
    phone: guest.phone,
    group_name: guest.group,
    party_size: guest.partySize,
    confirmed_count: guest.confirmedCount ?? null,
    rsvp_status: guest.rsvpStatus,
    table_id: seat?.kind === "table" ? seat.id : null,
    zone_id: seat?.kind === "zone" ? seat.id : null,
    arrived: guest.arrived,
    arrived_count: guest.arrivedCount ?? null,
    contact_count: guest.contactCount,
  };
}

export function tableFromRow(row: SeatingTableRow): SeatingTable {
  return {
    id: row.id,
    name: row.name,
    capacity: row.capacity,
    shape: row.shape,
    isReserved: row.is_reserved,
  };
}

export function tableToRow(eventId: string, table: SeatingTable): SeatingTableRow {
  return {
    event_id: eventId,
    id: table.id,
    name: table.name,
    capacity: table.capacity,
    shape: table.shape,
    is_reserved: table.isReserved,
  };
}

export function zoneFromRow(row: SeatingZoneRow): SeatingZone {
  return { id: row.id, name: row.name, tableIds: row.table_ids };
}

export function zoneToRow(eventId: string, zone: SeatingZone): SeatingZoneRow {
  return {
    event_id: eventId,
    id: zone.id,
    name: zone.name,
    table_ids: zone.tableIds,
  };
}

export interface LeadRow {
  id: string;
  names: string;
  phone: string;
  event_type: string;
  status: Lead["status"];
  follow_up_date: string | null;
  notes: string;
  created_at: string;
}

export function leadFromRow(row: LeadRow): Lead {
  return {
    id: row.id,
    names: row.names,
    phone: row.phone,
    eventType: row.event_type,
    status: row.status,
    followUpDate: row.follow_up_date,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

// Only maps the fields present, so it serves both inserts and partial updates.
export function leadToRow(lead: Partial<LeadInput>): Partial<LeadRow> {
  const row: Partial<LeadRow> = {};
  if (lead.names !== undefined) row.names = lead.names;
  if (lead.phone !== undefined) row.phone = lead.phone;
  if (lead.eventType !== undefined) row.event_type = lead.eventType;
  if (lead.status !== undefined) row.status = lead.status;
  if (lead.followUpDate !== undefined) row.follow_up_date = lead.followUpDate;
  if (lead.notes !== undefined) row.notes = lead.notes;
  return row;
}

export interface GiftRow {
  event_id: string;
  id: string;
  guest_name: string;
  attendees: number | null;
  amount: number | null;
}

export function giftFromRow(row: GiftRow): Gift {
  return {
    id: row.id,
    guestName: row.guest_name,
    attendees: row.attendees,
    amount: row.amount,
  };
}

export function giftToRow(eventId: string, gift: Gift): GiftRow {
  return {
    event_id: eventId,
    id: gift.id,
    guest_name: gift.guestName,
    attendees: gift.attendees,
    amount: gift.amount,
  };
}
