"use client";

import { useState, type FormEvent } from "react";
import { useDroppable } from "@dnd-kit/core";
import GuestChip from "@/components/GuestChip";
import { guestMatchesQuery } from "@/lib/guestSearch";
import { formatTableLabel } from "@/lib/tableDisplay";
import type { Guest } from "@/types/guest";
import type { SeatingTable } from "@/types/seating";

interface SeatingTableCardProps {
  table: SeatingTable;
  guests: Guest[];
  onRemoveGuest: (guestId: string) => void;
  onEditTable: (tableId: string, updates: { name: string; capacity: number }) => void;
  onDeleteTable: (tableId: string) => void;
  onToggleReserved: (tableId: string) => void;
  searchQuery?: string;
  // "source" = this table was picked first; "target" = another table was
  // picked and this one can be clicked to complete the swap.
  swapMode?: "idle" | "source" | "target";
  justSwapped?: boolean;
  onSwapClick?: (tableId: string) => void;
}

export default function SeatingTableCard({
  table,
  guests,
  onRemoveGuest,
  onEditTable,
  onDeleteTable,
  onToggleReserved,
  searchQuery = "",
  swapMode = "idle",
  justSwapped = false,
  onSwapClick,
}: SeatingTableCardProps) {
  const { setNodeRef, isOver } = useDroppable({ id: table.id });
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [name, setName] = useState(table.name);
  const [capacity, setCapacity] = useState(String(table.capacity));
  const [error, setError] = useState<string | null>(null);

  const seatedCount = guests.reduce((sum, guest) => sum + guest.partySize, 0);
  const isOverCapacity = seatedCount > table.capacity;
  const tableNumber = table.name.replace(/\D/g, "") || "?";
  const tableLabel = formatTableLabel(table);

  const hasSearchQuery = searchQuery.trim().length > 0;
  const matchingGuestIds = new Set(
    hasSearchQuery
      ? guests
          .filter((guest) => guestMatchesQuery(guest, searchQuery))
          .map((guest) => guest.id)
      : [],
  );
  const hasSearchMatch = matchingGuestIds.size > 0;

  const ringClasses = justSwapped
    ? "ring-2 ring-emerald-500 shadow-[0_0_18px_rgba(16,185,129,0.45)]"
    : swapMode === "source"
      ? "ring-4 ring-indigo-500 shadow-lg shadow-indigo-500/30 scale-[1.02]"
      : isOver
        ? "ring-2 ring-indigo-500"
        : hasSearchMatch
          ? "ring-2 ring-yellow-400 shadow-[0_0_16px_rgba(250,204,21,0.45)] dark:ring-yellow-400/80"
          : table.isReserved
            ? "ring-2 ring-amber-400 dark:ring-amber-500/60"
            : "ring-black/5";

  function startEdit() {
    setName(table.name);
    setCapacity(String(table.capacity));
    setError(null);
    setIsConfirmingDelete(false);
    setIsEditing(true);
  }

  function handleSaveEdit(e: FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    const parsedCapacity = Math.floor(Number(capacity));

    if (!trimmedName) {
      setError("יש להזין שם/מספר שולחן");
      return;
    }
    if (!Number.isFinite(parsedCapacity) || parsedCapacity <= 0) {
      setError("יש להזין מספר מקומות תקין");
      return;
    }

    onEditTable(table.id, { name: trimmedName, capacity: parsedCapacity });
    setIsEditing(false);
    setError(null);
  }

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col gap-2 rounded-xl bg-white p-3 shadow-md ring-1 transition duration-300 dark:bg-zinc-900 ${ringClasses}`}
    >
      {swapMode === "source" && (
        <p className="rounded-lg bg-indigo-50 px-2.5 py-1 text-center text-xs font-semibold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
          בחר שולחן להחלפה
        </p>
      )}
      {isEditing ? (
        <form onSubmit={handleSaveEdit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={`edit-name-${table.id}`}
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              שם/מספר שולחן
            </label>
            <input
              id={`edit-name-${table.id}`}
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              autoFocus
              className="rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={`edit-capacity-${table.id}`}
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              מספר מקומות
            </label>
            <input
              id={`edit-capacity-${table.id}`}
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => {
                setCapacity(e.target.value);
                setError(null);
              }}
              className="rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            />
          </div>

          {error && (
            <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 active:bg-indigo-800"
            >
              שמירה
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setError(null);
              }}
              className="flex-1 rounded-lg bg-zinc-100 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              ביטול
            </button>
          </div>
        </form>
      ) : isConfirmingDelete ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            למחוק את {tableLabel}? אורחים שמשובצים אליו יעברו לרשימת האורחים
            ללא שולחן.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onDeleteTable(table.id)}
              className="flex-1 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 active:bg-rose-800"
            >
              כן, מחיקה
            </button>
            <button
              type="button"
              onClick={() => setIsConfirmingDelete(false)}
              className="flex-1 rounded-lg bg-zinc-100 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              ביטול
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div
              className={`grid h-9 w-9 shrink-0 place-items-center border-2 text-sm font-bold ${
                table.isReserved
                  ? "border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-500 dark:bg-amber-500/10 dark:text-amber-300"
                  : "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
              } ${table.shape === "round" ? "rounded-full" : "rounded-lg"}`}
            >
              {tableNumber}
            </div>
            <div>
              <h3 className="font-semibold text-zinc-800 dark:text-zinc-100">
                {tableLabel}
              </h3>
              {table.isReserved && (
                <span className="mt-0.5 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                  רזרבה
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            <div className="flex items-center gap-1">
              {onSwapClick && (
                <button
                  type="button"
                  onClick={() => onSwapClick(table.id)}
                  aria-pressed={swapMode === "source"}
                  aria-label={
                    swapMode === "source"
                      ? `ביטול החלפה עבור ${tableLabel}`
                      : swapMode === "target"
                        ? `החלפה עם ${tableLabel}`
                        : `החלפת ${tableLabel} עם שולחן אחר`
                  }
                  title={
                    swapMode === "source"
                      ? "ביטול"
                      : swapMode === "target"
                        ? "החלף עם שולחן זה"
                        : "החלף"
                  }
                  className={`grid h-7 min-w-7 place-items-center rounded-full px-1 text-xs font-semibold transition ${
                    swapMode === "source"
                      ? "bg-indigo-600 px-2.5 text-white hover:bg-indigo-700"
                      : swapMode === "target"
                        ? "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-400 hover:bg-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:hover:bg-indigo-500/25"
                        : "text-zinc-400 hover:bg-indigo-100 hover:text-indigo-600 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400"
                  }`}
                >
                  {swapMode === "source" ? (
                    "ביטול"
                  ) : (
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M13.2 2.24a.75.75 0 0 0 .04 1.06l2.1 1.95H6.75a.75.75 0 0 0 0 1.5h8.59l-2.1 1.95a.75.75 0 1 0 1.02 1.1l3.5-3.25a.75.75 0 0 0 0-1.1l-3.5-3.25a.75.75 0 0 0-1.06.04Zm-6.4 8a.75.75 0 0 0-1.06-.04l-3.5 3.25a.75.75 0 0 0 0 1.1l3.5 3.25a.75.75 0 1 0 1.02-1.1l-2.1-1.95h8.59a.75.75 0 0 0 0-1.5H4.66l2.1-1.95a.75.75 0 0 0 .04-1.06Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={() => onToggleReserved(table.id)}
                aria-pressed={table.isReserved}
                aria-label={
                  table.isReserved
                    ? `ביטול רזרבה עבור ${tableLabel}`
                    : `הגדרת ${tableLabel} כרזרבה`
                }
                title={table.isReserved ? "ביטול רזרבה" : "הגדר כרזרבה"}
                className={`grid h-9 w-9 place-items-center rounded-full transition md:h-7 md:w-7 ${
                  table.isReserved
                    ? "bg-amber-100 text-amber-600 hover:bg-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:hover:bg-amber-500/25"
                    : "text-zinc-400 hover:bg-amber-100 hover:text-amber-600 dark:hover:bg-amber-500/10 dark:hover:text-amber-400"
                }`}
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M6.32 2.577a49.255 49.255 0 0 1 11.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 0 1-1.085.67L12 18.089l-7.165 3.583A.75.75 0 0 1 3.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93Z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={startEdit}
                aria-label={`עריכת ${tableLabel}`}
                className="grid h-9 w-9 place-items-center rounded-full text-zinc-400 md:h-7 md:w-7 transition hover:bg-indigo-100 hover:text-indigo-600 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M5.433 13.917l1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                  <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(true)}
                aria-label={`מחיקת ${tableLabel}`}
                className="grid h-9 w-9 place-items-center rounded-full text-zinc-400 md:h-7 md:w-7 transition hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

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
              {seatedCount}/{table.capacity}
            </span>
          </div>
        </div>
      )}

      <div className="flex min-h-10 flex-col gap-1.5">
        {guests.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 px-3 py-3 text-center text-sm text-zinc-400 dark:border-zinc-700 dark:text-zinc-500">
            גררו אורחים לכאן
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
