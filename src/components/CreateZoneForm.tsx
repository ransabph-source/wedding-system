"use client";

import { useState, type FormEvent } from "react";
import { formatTableLabel } from "@/lib/tableDisplay";
import type { SeatingTable, SeatingZone } from "@/types/seating";

interface CreateZoneFormProps {
  availableTables: SeatingTable[];
  onCreateZone: (zone: SeatingZone) => void;
}

export default function CreateZoneForm({
  availableTables,
  onCreateZone,
}: CreateZoneFormProps) {
  const [name, setName] = useState("");
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const hasAvailableTables = availableTables.length > 0;

  function toggleTable(tableId: string) {
    setSelectedTableIds((prev) =>
      prev.includes(tableId)
        ? prev.filter((id) => id !== tableId)
        : [...prev, tableId],
    );
    setError(null);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("יש להזין שם לאזור");
      return;
    }
    if (selectedTableIds.length === 0) {
      setError("יש לבחור לפחות שולחן אחד לאזור");
      return;
    }

    onCreateZone({
      id: crypto.randomUUID(),
      name: trimmedName,
      tableIds: selectedTableIds,
    });

    setName("");
    setSelectedTableIds([]);
    setError(null);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 rounded-xl bg-white p-3 shadow-md ring-1 ring-black/5 dark:bg-zinc-900"
    >
      <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
        אזורי הושבה
      </h3>

      {hasAvailableTables ? (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex flex-1 flex-col gap-1">
              <label
                htmlFor="zoneName"
                className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
              >
                שם האזור
              </label>
              <input
                id="zoneName"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                placeholder="לדוגמה: משפחת החתן"
                className="rounded-lg border border-zinc-300 bg-zinc-50 px-2.5 py-1.5 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              />
            </div>
            <button
              type="submit"
              className="h-fit shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-indigo-700 active:bg-indigo-800"
            >
              יצירה
            </button>
          </div>

          <div>
            <div className="flex flex-wrap gap-1.5">
              {availableTables.map((table) => {
                const selected = selectedTableIds.includes(table.id);
                return (
                  <button
                    key={table.id}
                    type="button"
                    onClick={() => toggleTable(table.id)}
                    aria-pressed={selected}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                      selected
                        ? "border-indigo-600 bg-indigo-600 text-white"
                        : "border-zinc-300 bg-zinc-50 text-zinc-600 hover:border-indigo-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    }`}
                  >
                    {formatTableLabel(table)}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <p className="text-sm text-zinc-400 dark:text-zinc-500">
          אין שולחנות בודדים זמינים ליצירת אזור חדש
        </p>
      )}

      {error && (
        <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
      )}
    </form>
  );
}
