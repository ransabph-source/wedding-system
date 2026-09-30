import type { Guest } from "@/types/guest";

// Groups guests that share the same trimmed name AND the same phone digits.
// Guests missing either a name or a phone are skipped so they can't be
// falsely matched against each other.
export function findDuplicateGuests(guests: Guest[]): Guest[][] {
  const groups = new Map<string, Guest[]>();

  for (const guest of guests) {
    const name = (guest.name ?? "").trim();
    const phone = (guest.phone ?? "").replace(/\D/g, "");
    if (!name || !phone) continue;

    const key = `${name}\u0000${phone}`;
    const group = groups.get(key);
    if (group) group.push(guest);
    else groups.set(key, [guest]);
  }

  return [...groups.values()].filter((group) => group.length > 1);
}
