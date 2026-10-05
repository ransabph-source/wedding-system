"use client";

import { useDroppable } from "@dnd-kit/core";
import GuestChip from "@/components/GuestChip";
import SeatingPickTarget from "@/components/SeatingPickTarget";
import type { Guest } from "@/types/guest";

interface UnseatedGuestsPanelProps {
  guests: Guest[];
  isFiltered?: boolean;
}

export default function UnseatedGuestsPanel({
  guests,
  isFiltered = false,
}: UnseatedGuestsPanelProps) {
  const { setNodeRef, isOver } = useDroppable({ id: "unseated" });

  return (
    <div
      ref={setNodeRef}
      className={`flex h-full flex-col gap-2 rounded-xl bg-white p-3 shadow-md ring-1 transition dark:bg-zinc-900 ${
        isOver ? "ring-2 ring-indigo-500" : "ring-black/5"
      }`}
    >
      <div className="shrink-0">
        <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          אורחים ללא שולחן
        </h3>
        <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
          גררו לשולחן, או הקישו על אורח ואז על &quot;העבר לכאן&quot;
        </p>
      </div>
      <SeatingPickTarget
        targetId="unseated"
        guestIds={guests.map((guest) => guest.id)}
        label="החזר לרשימה ללא שולחן"
      />

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pe-1">
        {guests.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 px-3 py-6 text-center text-sm text-zinc-400 dark:border-zinc-700 dark:text-zinc-500">
            {isFiltered
              ? "לא נמצאו אורחים ללא שולחן התואמים לחיפוש"
              : "כל האורחים שאישרו הגעה משובצים לשולחן"}
          </p>
        ) : (
          guests.map((guest) => <GuestChip key={guest.id} guest={guest} />)
        )}
      </div>
    </div>
  );
}
