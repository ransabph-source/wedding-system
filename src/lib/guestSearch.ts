import type { Guest } from "@/types/guest";

export function guestMatchesQuery(guest: Guest, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  return guest.name.toLowerCase().includes(q);
}
