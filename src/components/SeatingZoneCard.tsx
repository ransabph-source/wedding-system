"use client";

import { useDroppable } from "@dnd-kit/core";
import GuestChip from "@/components/GuestChip";
import SeatingPickTarget from "@/components/SeatingPickTarget";
import { guestMatchesQuery } from "@/lib/guestSearch";
import { formatTableLabel } from "@/lib/tableDisplay";
import type { Guest } from "@/types/guest";
import type { SeatingTable, SeatingZone } from "@/types/seating";

interface SeatingZoneCardProps {
  zone: SeatingZone;
  memberTables: SeatingTable[];
  guests: Guest[];
  onRemoveGuest: (guestId: string) => void;
  onDeleteZone: (zoneId: string) => void;
  searchQuery?: string;
}

export default function SeatingZoneCard({
  zone,
  memberTables,
  guests,
  onRemoveGuest,
  onDeleteZone,
  searchQuery = "",
}: SeatingZoneCardProps) {
  const { setNodeRef, isOver } = useDroppable({ id: zone.id });
  const capacity = memberTables.reduce((sum, table) => sum + table.capacity, 0);
  const seatedCount = guests.reduce((sum, guest) => sum + guest.partySize, 0);
  const isOverCapacity = seatedCount > capacity;

  const hasSearchQuery = searchQuery.trim().length > 0;
  const matchingGuestIds = new Set(
    hasSearchQuery
      ? guests
          .filter((guest) => guestMatchesQuery(guest, searchQuery))
          .map((guest) => guest.id)
      : [],
  );
  const hasSearchMatch = matchingGuestIds.size > 0;

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col gap-2 rounded-xl border-2 border-dashed bg-violet-50/60 p-3 shadow-md transition dark:bg-violet-500/5 ${
        isOver
          ? "border-indigo-500 ring-2 ring-indigo-500"
          : hasSearchMatch
            ? "border-yellow-400 ring-2 ring-yellow-400 shadow-[0_0_16px_rgba(250,204,21,0.45)] dark:border-yellow-400/80"
            : "border-violet-300 dark:border-violet-700"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-flex rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
            אזור הושבה
          </span>
          <h3 className="mt-1 truncate font-semibold text-zinc-800 dark:text-zinc-100">
            {zone.name}
          </h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {memberTables.map((table) => (
              <span
                key={table.id}
                className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-zinc-600 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700"
              >
                {formatTableLabel(table)}
              </span>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
              isOverCapacity
                ? "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400"
                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
            }`}
          >
            {isOverCapacity && (
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.169 2.63-1.516 2.63H3.72c-1.347 0-2.189-1.463-1.515-2.63L8.485 2.495ZM10 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            {seatedCount}/{capacity}
          </span>
          <button
            type="button"
            onClick={() => onDeleteZone(zone.id)}
            className="text-xs font-medium text-zinc-400 underline-offset-2 transition hover:text-rose-600 hover:underline dark:hover:text-rose-400"
          >
            פירוק אזור
          </button>
        </div>
      </div>

      <div className="flex min-h-16 flex-col gap-2">
        <SeatingPickTarget
          targetId={zone.id}
          guestIds={guests.map((guest) => guest.id)}
        />
        {guests.length === 0 ? (
          <p className="rounded-xl border border-dashed border-violet-300/70 px-3 py-6 text-center text-sm text-zinc-400 dark:border-violet-700/50 dark:text-zinc-500">
            גררו אורחים לאזור זה
          </p>
        ) : (
          guests.map((guest) => (
            <GuestChip
              key={guest.id}
              guest={guest}
              onRemove={onRemoveGuest}
              highlighted={matchingGuestIds.has(guest.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
