"use client";

import { useEffect } from "react";
import LiveTablePicker from "@/components/LiveTablePicker";
import { formatTableLabel } from "@/lib/tableDisplay";
import { getTableOccupancy } from "@/lib/tableOccupancy";
import type { Guest } from "@/types/guest";
import type { SeatingTable } from "@/types/seating";

interface LiveReassignTableModalProps {
  guest: Guest;
  guests: Guest[];
  tables: SeatingTable[];
  onReassign: (guestId: string, tableId: string) => void;
  onClose: () => void;
}

export default function LiveReassignTableModal({
  guest,
  guests,
  tables,
  onReassign,
  onClose,
}: LiveReassignTableModalProps) {
  // Free seats are counted without this guest, so moving them never counts
  // their own seats against the table they're leaving.
  const occupancy = getTableOccupancy(
    tables,
    guests.filter((g) => g.id !== guest.id),
  );
  const currentTableId =
    guest.seatingAssignment?.kind === "table" ? guest.seatingAssignment.id : null;
  const currentTable = tables.find((table) => table.id === currentTableId);
  const hasRoomSomewhere = occupancy.some(
    (entry) =>
      entry.table.id !== currentTableId && entry.freeSeats >= guest.partySize,
  );

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reassign-title"
    >
      <div
        className="absolute inset-0 bg-zinc-950/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative flex max-h-[94dvh] w-full max-w-lg flex-col rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl ring-1 ring-black/5 transition duration-200 starting:translate-y-8 starting:opacity-0 sm:max-h-[90vh] sm:rounded-3xl sm:pb-0 dark:bg-zinc-900 dark:ring-white/10">
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
          <div className="min-w-0">
            <h2
              id="reassign-title"
              className="text-xl font-bold text-zinc-900 dark:text-zinc-50"
            >
              שינוי שיבוץ
            </h2>
            <p className="mt-0.5 truncate text-base text-zinc-600 dark:text-zinc-300">
              <span className="font-bold text-zinc-900 dark:text-zinc-50">
                {guest.name}
              </span>
              {guest.partySize > 1 && ` · ${guest.partySize} אורחים`}
              {" · "}
              {currentTable ? `כרגע ב${formatTableLabel(currentTable)}` : "ללא שולחן"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגירה"
            className="grid h-14 w-14 shrink-0 place-items-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6" aria-hidden="true">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-3 overflow-y-auto overscroll-contain px-5 py-5">
          {tables.length === 0 ? (
            <p className="py-6 text-center text-lg text-zinc-500 dark:text-zinc-400">
              עדיין לא הוגדרו שולחנות לאירוע
            </p>
          ) : (
            <>
              <p className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
                בחרו שולחן חדש
              </p>
              {!hasRoomSomewhere && (
                <p className="rounded-xl bg-amber-50 px-3 py-2 text-base font-semibold text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                  אין שולחן עם {guest.partySize} מקומות פנויים כרגע.
                </p>
              )}
              <LiveTablePicker
                occupancy={occupancy}
                partySize={guest.partySize}
                selectedTableId={null}
                currentTableId={currentTableId}
                onSelect={(tableId) => {
                  if (tableId) onReassign(guest.id, tableId);
                }}
                blockOverbooking
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
