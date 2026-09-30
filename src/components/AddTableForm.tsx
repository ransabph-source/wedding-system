"use client";

import { useState, type FormEvent } from "react";
import { getNextTableNumber } from "@/lib/tableDisplay";
import type { SeatingTable } from "@/types/seating";

interface AddTableFormProps {
  existingTables: SeatingTable[];
  onAddTables: (tables: SeatingTable[]) => void;
}

const inputClasses =
  "rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-2.5 py-1.5 text-sm text-zinc-900 dark:text-zinc-50 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30";

const labelClasses = "text-xs font-medium text-zinc-700 dark:text-zinc-300";

export default function AddTableForm({
  existingTables,
  onAddTables,
}: AddTableFormProps) {
  const [quantity, setQuantity] = useState("1");
  const [capacity, setCapacity] = useState("12");
  const [isReserved, setIsReserved] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsedQuantity = Math.floor(Number(quantity));
    const parsedCapacity = Math.floor(Number(capacity));
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) return;
    if (!Number.isFinite(parsedCapacity) || parsedCapacity <= 0) return;

    const startNumber = getNextTableNumber(existingTables);
    const newTables: SeatingTable[] = Array.from(
      { length: parsedQuantity },
      (_, i) => ({
        id: crypto.randomUUID(),
        name: String(startNumber + i),
        capacity: parsedCapacity,
        shape: "round",
        isReserved,
      }),
    );

    onAddTables(newTables);

    setQuantity("1");
    setCapacity("12");
    setIsReserved(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-2 gap-2 rounded-xl bg-white p-3 shadow-md ring-1 ring-black/5 items-end dark:bg-zinc-900"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="tableQuantity" className={labelClasses}>
          כמה שולחנות להוסיף?
        </label>
        <input
          id="tableQuantity"
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className={inputClasses}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="tableCapacity" className={labelClasses}>
          מספר מקומות לכל שולחן
        </label>
        <input
          id="tableCapacity"
          type="number"
          min={1}
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          className={inputClasses}
          required
        />
      </div>

      <label className="flex items-center gap-1.5 pb-1.5 text-xs font-medium whitespace-nowrap text-zinc-700 dark:text-zinc-300">
        <input
          type="checkbox"
          checked={isReserved}
          onChange={(e) => setIsReserved(e.target.checked)}
          className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500/30 dark:border-zinc-600"
        />
        רזרבה
      </label>

      <button
        type="submit"
        className="h-fit shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-indigo-700 active:bg-indigo-800"
      >
        הוספה
      </button>
    </form>
  );
}
