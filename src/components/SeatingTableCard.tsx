"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import GuestChip from "@/components/GuestChip";
import SeatingPickTarget from "@/components/SeatingPickTarget";
import { guestMatchesQuery } from "@/lib/guestSearch";
import { formatTableLabel } from "@/lib/tableDisplay";
import type { Guest } from "@/types/guest";
import type { SeatingTable } from "@/types/seating";

interface SeatingTableCardProps {
  table: SeatingTable;
  guests: Guest[];
  onRemoveGuest: (guestId: string) => void;
  onEmptyTable: (tableId: string) => void;
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
  onEmptyTable,
  searchQuery = "",
  swapMode = "idle",
  justSwapped = false,
  onSwapClick,
}: SeatingTableCardProps) {
  const { setNodeRef, isOver } = useDroppable({ id: table.id });
  // Table structure (name, capacity, reserved) is managed by admins on the
  // admin event page; here guests are only moved in and out.
  const [isConfirmingEmpty, setIsConfirmingEmpty] = useState(false);

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
      {isConfirmingEmpty ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {`לרוקן את ${tableLabel}? כל ${guests.length} האורחים שמשובצים אליו יחזרו לרשימת האורחים ללא שולחן.`}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                onEmptyTable(table.id);
                setIsConfirmingEmpty(false);
              }}
              className="flex-1 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 active:bg-rose-800"
            >
              כן, רוקן
            </button>
            <button
              type="button"
              onClick={() => setIsConfirmingEmpty(false)}
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
              {guests.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsConfirmingEmpty(true)}
                  aria-label={`ריקון ${tableLabel}`}
                  title="רוקן שולחן"
                  className="grid h-9 w-9 place-items-center rounded-full text-zinc-400 md:h-7 md:w-7 transition hover:bg-orange-100 hover:text-orange-600 dark:hover:bg-orange-500/10 dark:hover:text-orange-400"
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M11 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM2.046 15.253c-.058.468.172.92.57 1.175A9.953 9.953 0 0 0 8 18c1.982 0 3.83-.578 5.384-1.573.398-.254.628-.707.57-1.175a6.001 6.001 0 0 0-11.908 0ZM12.75 7.75a.75.75 0 0 0 0 1.5h5.5a.75.75 0 0 0 0-1.5h-5.5Z" />
                  </svg>
                </button>
              )}
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
        <SeatingPickTarget
          targetId={table.id}
          guestIds={guests.map((guest) => guest.id)}
        />
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
