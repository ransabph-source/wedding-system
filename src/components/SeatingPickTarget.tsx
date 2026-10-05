"use client";

import { useSeatingPick } from "@/lib/seatingPick";

interface SeatingPickTargetProps {
  targetId: string;
  // Guests already in this target; no button when the picked guest is one.
  guestIds: string[];
  label?: string;
}

export default function SeatingPickTarget({
  targetId,
  guestIds,
  label = "העבר לכאן",
}: SeatingPickTargetProps) {
  const pick = useSeatingPick();
  if (!pick?.pickedGuestId || guestIds.includes(pick.pickedGuestId)) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => pick.placePicked(targetId)}
      className="flex min-h-11 w-full touch-manipulation items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-indigo-400 bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100 active:scale-[0.98] dark:border-indigo-500/60 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
        <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
      </svg>
      {label}
    </button>
  );
}
