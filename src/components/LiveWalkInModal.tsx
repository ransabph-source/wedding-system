"use client";

import { useEffect, useState, type FormEvent } from "react";
import LiveTablePicker from "@/components/LiveTablePicker";
import { getTableOccupancy } from "@/lib/tableOccupancy";
import type { Guest } from "@/types/guest";
import type { SeatingTable } from "@/types/seating";

// The guest-list group walk-ins are filed under, so the couple can find them.
export const WALK_IN_GROUP = "מזדמנים";

const MAX_PARTY_SIZE = 30;

interface LiveWalkInModalProps {
  guests: Guest[];
  tables: SeatingTable[];
  onAdd: (guest: Guest) => void;
  onClose: () => void;
}

export default function LiveWalkInModal({
  guests,
  tables,
  onAdd,
  onClose,
}: LiveWalkInModalProps) {
  const [name, setName] = useState("");
  const [partySize, setPartySize] = useState(1);
  const [tableId, setTableId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const occupancy = getTableOccupancy(tables, guests);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("יש להזין שם אורח");
      return;
    }
    onAdd({
      id: crypto.randomUUID(),
      name: trimmedName,
      phone: "",
      group: WALK_IN_GROUP,
      partySize,
      confirmedCount: partySize,
      seatingAssignment: tableId ? { kind: "table", id: tableId } : null,
      arrived: true,
      rsvpStatus: "confirmed",
      contactCount: 0,
    });
  }

  const stepperButtonClasses =
    "grid h-16 w-16 shrink-0 touch-manipulation place-items-center rounded-2xl bg-zinc-100 text-3xl font-bold text-zinc-800 transition active:scale-95 disabled:opacity-30 dark:bg-zinc-800 dark:text-zinc-100";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="walk-in-title"
    >
      <div
        className="absolute inset-0 bg-zinc-950/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <form
        onSubmit={handleSubmit}
        className="relative flex max-h-[94dvh] w-full max-w-lg flex-col rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl ring-1 ring-black/5 transition duration-200 starting:translate-y-8 starting:opacity-0 sm:max-h-[90vh] sm:rounded-3xl sm:pb-0 dark:bg-zinc-900 dark:ring-white/10"
      >
        <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
          <h2
            id="walk-in-title"
            className="text-xl font-bold text-zinc-900 dark:text-zinc-50"
          >
            הוספת אורח מהירה
          </h2>
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

        <div className="flex flex-col gap-6 overflow-y-auto overscroll-contain px-5 py-5">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="walk-in-name"
              className="text-base font-semibold text-zinc-800 dark:text-zinc-200"
            >
              שם האורח
            </label>
            <input
              id="walk-in-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              autoFocus
              autoComplete="off"
              enterKeyHint="done"
              maxLength={100}
              className="h-16 rounded-2xl border-2 border-zinc-300 bg-white px-4 text-xl text-zinc-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
            />
            {error && (
              <p className="text-base font-medium text-rose-600 dark:text-rose-400">
                {error}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
              מספר אורחים
            </span>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setPartySize((n) => Math.max(1, n - 1))}
                disabled={partySize <= 1}
                aria-label="הפחתת אורח"
                className={stepperButtonClasses}
              >
                −
              </button>
              <output
                aria-live="polite"
                className="min-w-16 text-center text-4xl font-extrabold tabular-nums text-zinc-900 dark:text-zinc-50"
              >
                {partySize}
              </output>
              <button
                type="button"
                onClick={() =>
                  setPartySize((n) => Math.min(MAX_PARTY_SIZE, n + 1))
                }
                disabled={partySize >= MAX_PARTY_SIZE}
                aria-label="הוספת אורח"
                className={stepperButtonClasses}
              >
                +
              </button>
            </div>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-base font-semibold text-zinc-800 dark:text-zinc-200">
              שיבוץ לשולחן{" "}
              <span className="font-normal text-zinc-500 dark:text-zinc-400">
                (לא חובה)
              </span>
            </legend>
            <LiveTablePicker
              occupancy={occupancy}
              partySize={partySize}
              selectedTableId={tableId}
              onSelect={setTableId}
              allowNone
            />
            {tableId &&
              (occupancy.find((o) => o.table.id === tableId)?.freeSeats ?? 0) <
                partySize && (
                <p className="mt-1 rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                  אין מספיק מקומות פנויים בשולחן הזה. אפשר להוסיף בכל זאת.
                </p>
              )}
          </fieldset>
        </div>

        <div className="border-t border-zinc-100 px-5 py-4 dark:border-zinc-800">
          <button
            type="submit"
            className="flex h-16 w-full touch-manipulation items-center justify-center rounded-2xl bg-emerald-600 text-xl font-bold text-white shadow-lg transition hover:bg-emerald-700 active:scale-[0.98]"
          >
            הוספה וסימון הגעה
          </button>
        </div>
      </form>
    </div>
  );
}
