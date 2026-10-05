"use client";

import { formatTableLabel } from "@/lib/tableDisplay";
import type { TableOccupancy } from "@/lib/tableOccupancy";

interface LiveTablePickerProps {
  occupancy: TableOccupancy[];
  partySize: number;
  selectedTableId: string | null;
  onSelect: (tableId: string | null) => void;
  // Offers a "no table" choice first.
  allowNone?: boolean;
  // The guest's current table, shown as such and not selectable.
  currentTableId?: string | null;
  // Disables tables without room for the party instead of only flagging them.
  blockOverbooking?: boolean;
}

function freeSeatsText(freeSeats: number): string {
  if (freeSeats === 1) return "מקום פנוי אחד";
  if (freeSeats > 0) return `${freeSeats} מקומות פנויים`;
  if (freeSeats === 0) return "מלא";
  return `חריגה של ${-freeSeats}`;
}

export default function LiveTablePicker({
  occupancy,
  partySize,
  selectedTableId,
  onSelect,
  allowNone = false,
  currentTableId = null,
  blockOverbooking = false,
}: LiveTablePickerProps) {
  const optionClasses =
    "flex min-h-16 touch-manipulation flex-col items-center justify-center rounded-2xl border-2 px-2 py-2 text-center transition active:scale-[0.97] disabled:active:scale-100";

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {allowNone && (
        <button
          type="button"
          onClick={() => onSelect(null)}
          aria-pressed={selectedTableId === null}
          className={`${optionClasses} text-base font-bold ${
            selectedTableId === null
              ? "border-indigo-600 bg-indigo-600 text-white"
              : "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
          }`}
        >
          ללא שולחן
        </button>
      )}
      {occupancy.map(({ table, freeSeats }) => {
        const isCurrent = table.id === currentTableId;
        const isSelected = table.id === selectedTableId;
        const fits = freeSeats >= partySize;
        const isDisabled = isCurrent || (blockOverbooking && !fits);
        return (
          <button
            key={table.id}
            type="button"
            onClick={() => onSelect(table.id)}
            disabled={isDisabled}
            aria-pressed={isSelected}
            className={`${optionClasses} ${
              isSelected
                ? "border-indigo-600 bg-indigo-600 text-white"
                : isCurrent
                  ? "border-dashed border-indigo-300 bg-indigo-50 text-indigo-800 dark:border-indigo-500/50 dark:bg-indigo-500/10 dark:text-indigo-200"
                  : fits
                    ? "border-emerald-300 bg-emerald-50 text-zinc-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-zinc-50"
                    : blockOverbooking
                      ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-600"
                      : "border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-400"
            }`}
          >
            <span className="text-base font-bold">
              {formatTableLabel(table)}
            </span>
            <span
              className={`text-sm font-semibold ${
                isSelected
                  ? "text-indigo-100"
                  : isCurrent
                    ? ""
                    : fits
                      ? "text-emerald-700 dark:text-emerald-400"
                      : freeSeats < 0 && !blockOverbooking
                        ? "text-rose-600 dark:text-rose-400"
                        : ""
              }`}
            >
              {isCurrent ? "השולחן הנוכחי" : freeSeatsText(freeSeats)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
