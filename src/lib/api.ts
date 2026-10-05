// Browser-side wrappers around the /api routes.
import type { ClientAccount } from "@/types/client";
import type { EventPhase, EventRecord } from "@/types/event";
import type { Gift } from "@/types/gift";
import type { Guest } from "@/types/guest";
import type { Lead, LeadInput } from "@/types/lead";
import type { StaffAccount } from "@/types/staff";
import type { SeatingTable, SeatingZone } from "@/types/seating";

export type EventCollection = "guests" | "tables" | "zones";

export interface EventCollections {
  guests: Guest[];
  tables: SeatingTable[];
  zones: SeatingZone[];
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(
      `${init?.method ?? "GET"} ${url} failed (${response.status}): ${body?.error ?? response.statusText}`,
    );
  }
  return (response.status === 204 ? undefined : await response.json()) as T;
}

export function fetchEvents() {
  return request<EventRecord[]>("/api/events");
}

export function updateEventPhase(eventId: string, phase: EventPhase) {
  return request<EventRecord>(`/api/events/${encodeURIComponent(eventId)}`, {
    method: "PUT",
    body: JSON.stringify({ phase }),
  });
}

function giftsUrl(eventId: string) {
  return `/api/events/${encodeURIComponent(eventId)}/gifts`;
}

export function fetchGifts(eventId: string) {
  return request<Gift[]>(giftsUrl(eventId));
}

// Creates or replaces gifts by ID. keepalive lets a save started as the page
// closes still reach the server.
export function saveGifts(eventId: string, gifts: Gift[], keepalive = false) {
  return request<Gift[]>(giftsUrl(eventId), {
    method: "PUT",
    body: JSON.stringify(gifts),
    keepalive,
  });
}

export function deleteGifts(eventId: string, ids: string[]) {
  return request<void>(giftsUrl(eventId), {
    method: "DELETE",
    body: JSON.stringify({ ids }),
  });
}

function floorPlanUrl(eventId: string) {
  return `/api/events/${encodeURIComponent(eventId)}/floor-plan`;
}

// A short-lived signed URL for the event's hall floor plan, or null.
export async function fetchFloorPlanUrl(eventId: string) {
  const { url } = await request<{ url?: string | null }>(floorPlanUrl(eventId));
  return url || null;
}

export async function uploadFloorPlan(eventId: string, file: File) {
  const { url } = await request<{ url: string }>(floorPlanUrl(eventId), {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  return url;
}

export function deleteFloorPlan(eventId: string) {
  return request<void>(floorPlanUrl(eventId), { method: "DELETE" });
}

function collectionUrl(eventId: string, collection: EventCollection) {
  return `/api/events/${encodeURIComponent(eventId)}/${collection}`;
}

export async function fetchEventCollections(
  eventId: string,
): Promise<EventCollections> {
  const [guests, tables, zones] = await Promise.all([
    request<Guest[]>(collectionUrl(eventId, "guests")),
    request<SeatingTable[]>(collectionUrl(eventId, "tables")),
    request<SeatingZone[]>(collectionUrl(eventId, "zones")),
  ]);
  return { guests, tables, zones };
}

// Persists the difference between two versions of a collection: new IDs are
// POSTed, removed IDs DELETEd, and items whose object identity changed PUT.
// State updates follow the immutable pattern (untouched items keep their
// reference), so identity is a reliable and cheap change signal.
export async function syncCollection<Item extends { id: string }>(
  eventId: string,
  collection: EventCollection,
  prev: Item[],
  next: Item[],
) {
  const prevById = new Map(prev.map((item) => [item.id, item]));
  const nextIds = new Set(next.map((item) => item.id));

  const created = next.filter((item) => !prevById.has(item.id));
  const changed = next.filter(
    (item) => prevById.has(item.id) && prevById.get(item.id) !== item,
  );
  const removedIds = prev
    .filter((item) => !nextIds.has(item.id))
    .map((item) => item.id);

  const url = collectionUrl(eventId, collection);
  // Sequential so a request never races one it depends on within the batch.
  if (created.length > 0) {
    await request(url, { method: "POST", body: JSON.stringify(created) });
  }
  if (changed.length > 0) {
    await request(url, { method: "PUT", body: JSON.stringify(changed) });
  }
  if (removedIds.length > 0) {
    await request(url, {
      method: "DELETE",
      body: JSON.stringify({ ids: removedIds }),
    });
  }
}

export interface NewClient {
  coupleNames: string;
  email: string;
  password: string;
  eventDate: string;
  venue: string;
  // Optional contact phone.
  phone?: string;
}

export function createClientAccount(client: NewClient) {
  return request<{ userId: string; event: EventRecord }>("/api/admin/clients", {
    method: "POST",
    body: JSON.stringify(client),
  });
}

export function fetchClients() {
  return request<ClientAccount[]>("/api/admin/clients");
}

// Admins only. Deletes an event (with its guests, tables and zones) without
// touching any account.
export function deleteEvent(eventId: string) {
  return request<void>(`/api/events/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
  });
}

export function deleteClient(userId: string) {
  return request<void>(`/api/admin/clients/${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });
}

export function setClientPassword(userId: string, password: string) {
  return request<void>(
    `/api/admin/clients/${encodeURIComponent(userId)}/password`,
    { method: "PUT", body: JSON.stringify({ password }) },
  );
}

export interface NewStaff {
  name: string;
  email: string;
  password: string;
}

export function fetchStaff() {
  return request<StaffAccount[]>("/api/admin/staff");
}

export function createStaff(staff: NewStaff) {
  return request<StaffAccount>("/api/admin/staff", {
    method: "POST",
    body: JSON.stringify(staff),
  });
}

export function deleteStaff(userId: string) {
  return request<void>(`/api/admin/staff/${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });
}

export function setStaffPassword(userId: string, password: string) {
  return request<void>(
    `/api/admin/staff/${encodeURIComponent(userId)}/password`,
    { method: "PUT", body: JSON.stringify({ password }) },
  );
}

export function fetchLeads() {
  return request<Lead[]>("/api/admin/leads");
}

export function createLead(lead: LeadInput) {
  return request<Lead>("/api/admin/leads", {
    method: "POST",
    body: JSON.stringify(lead),
  });
}

export function updateLead(id: string, changes: Partial<LeadInput>) {
  return request<Lead>(`/api/admin/leads/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(changes),
  });
}

export function deleteLead(id: string) {
  return request<void>(`/api/admin/leads/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
