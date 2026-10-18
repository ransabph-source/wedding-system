"use client";

import { useState, type FormEvent } from "react";
import AddTableForm from "@/components/AddTableForm";
import { formatTableLabel } from "@/lib/tableDisplay";
import type { Guest } from "@/types/guest";
import type { SeatingTable, SeatingZone } from "@/types/seating";

export type TableUpdates = Partial<
  Pick<SeatingTable, "name" | "capacity" | "isReserved">
>;

interface AdminTableManagerProps {
  tables: SeatingTable[];
  zones: SeatingZone[];
  guests: Guest[];
  onAddTables: (tables: SeatingTable[]) => void;
  onUpdateTable: (tableId: string, updates: TableUpdates) => void;
  onDeleteTable: (tableId: string) => void;
}

const inputClasses =
  "w-full rounded-lg border border-zinc-300 bg-zinc-50 px-2.5 py-1.5 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50";

const iconButtonClasses =
  "grid h-9 w-9 place-items-center rounded-full text-zinc-400 transition md:h-7 md:w-7";

// The table structure couples seat their guests into. Couples can't change
// it themselves (the tables API refuses their writes), so it lives here.
export default function AdminTableManager({
  tables,
  zones,
  guests,
  onAddTables,
  onUpdateTable,
  onDeleteTable,
}: AdminTableManagerProps) {
  const seatedByTableId = new Map<string, number>();
  for (const guest of guests) {
    if (guest.seatingAssignment?.kind !== "table") continue;
    const tableId = guest.seatingAssignment.id;
    seatedByTableId.set(
      tableId,
      (seatedByTableId.get(tableId) ?? 0) + guest.partySize,
    );
  }
  const zoneNameByTableId = new Map(
    zones.flatMap((zone) => zone.tableIds.map((id) => [id, zone.name])),
  );
  const totalSeats = tables.reduce((sum, table) => sum + table.capacity, 0);

  return (
    <div className="flex flex-col gap-2">
      <AddTableForm existingTables={tables} onAddTables={onAddTables} />

      <div className="overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-black/5 dark:bg-zinc-900">
        <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          <span>{tables.length} שולחנות</span>
          <span>{totalSeats} מקומות סה&quot;כ</span>
        </div>
        {tables.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            עדיין לא הוגדרו שולחנות לאירוע.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {tables.map((table) => (
              <TableRow
                key={table.id}
                table={table}
                seatedCount={seatedByTableId.get(table.id) ?? 0}
                zoneName={zoneNameByTableId.get(table.id)}
                onUpdate={(updates) => onUpdateTable(table.id, updates)}
                onDelete={() => onDeleteTable(table.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function TableRow({
  table,
  seatedCount,
  zoneName,
  onUpdate,
  onDelete,
}: {
  table: SeatingTable;
  seatedCount: number;
  zoneName: string | undefined;
  onUpdate: (updates: TableUpdates) => void;
  onDelete: () => void;
}) {
  const [mode, setMode] = useState<"view" | "edit" | "confirmDelete">("view");
  const [name, setName] = useState(table.name);
  const [capacity, setCapacity] = useState(String(table.capacity));
  const [error, setError] = useState<string | null>(null);

  const tableLabel = formatTableLabel(table);
  const isOverCapacity = seatedCount > table.capacity;

  function startEdit() {
    setName(table.name);
    setCapacity(String(table.capacity));
    setError(null);
    setMode("edit");
  }

  function handleSave(e: FormEvent) {
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
    onUpdate({ name: trimmedName, capacity: parsedCapacity });
    setMode("view");
  }

  if (mode === "edit") {
    return (
      <li className="px-3 py-3">
        <form
          onSubmit={handleSave}
          className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[1fr_8rem_auto]"
        >
          <label className="col-span-2 flex flex-col gap-1 text-xs font-medium text-zinc-700 sm:col-span-1 dark:text-zinc-300">
            שם/מספר שולחן
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              autoFocus
              className={inputClasses}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-700 dark:text-zinc-300">
            מספר מקומות
            <input
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => {
                setCapacity(e.target.value);
                setError(null);
              }}
              className={inputClasses}
            />
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              className="min-h-9 flex-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-indigo-700 active:bg-indigo-800"
            >
              שמירה
            </button>
            <button
              type="button"
              onClick={() => setMode("view")}
              className="min-h-9 flex-1 rounded-lg bg-zinc-100 px-3 py-1.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              ביטול
            </button>
          </div>
        </form>
        {error && (
          <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">{error}</p>
        )}
        {!error && Math.floor(Number(capacity)) < seatedCount && (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
            כבר משובצים לשולחן {seatedCount} אורחים, יותר מהמקומות שהוזנו.
          </p>
        )}
      </li>
    );
  }

  if (mode === "confirmDelete") {
    return (
      <li className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {`למחוק את ${tableLabel}? ${
            seatedCount > 0
              ? `${seatedCount} האורחים שמשובצים אליו יעברו לרשימת האורחים ללא שולחן, ו`
              : ""
          }מספרי השולחנות שאחריו יתעדכנו.`}
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => {
              onDelete();
              setMode("view");
            }}
            className="min-h-9 flex-1 rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-rose-700 active:bg-rose-800"
          >
            כן, מחיקה
          </button>
          <button
            type="button"
            onClick={() => setMode("view")}
            className="min-h-9 flex-1 rounded-lg bg-zinc-100 px-3 py-1.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            ביטול
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          {tableLabel}
        </span>
        {table.isReserved && (
          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
            רזרבה
          </span>
        )}
        {zoneName && (
          <span className="shrink-0 truncate rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {zoneName}
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <span
          className={`me-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
            isOverCapacity
              ? "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400"
              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
          }`}
        >
          {seatedCount}/{table.capacity}
        </span>
        <button
          type="button"
          onClick={() => onUpdate({ isReserved: !table.isReserved })}
          aria-pressed={table.isReserved}
          aria-label={
            table.isReserved
              ? `ביטול רזרבה עבור ${tableLabel}`
              : `הגדרת ${tableLabel} כרזרבה`
          }
          title={table.isReserved ? "ביטול רזרבה" : "הגדר כרזרבה"}
          className={`${iconButtonClasses} ${
            table.isReserved
              ? "bg-amber-100 text-amber-600 hover:bg-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:hover:bg-amber-500/25"
              : "hover:bg-amber-100 hover:text-amber-600 dark:hover:bg-amber-500/10 dark:hover:text-amber-400"
          }`}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M6.32 2.577a49.255 49.255 0 0 1 11.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 0 1-1.085.67L12 18.089l-7.165 3.583A.75.75 0 0 1 3.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93Z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={startEdit}
          aria-label={`עריכת ${tableLabel}`}
          title="עריכה"
          className={`${iconButtonClasses} hover:bg-indigo-100 hover:text-indigo-600 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400`}
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M5.433 13.917l1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
            <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => setMode("confirmDelete")}
          aria-label={`מחיקת ${tableLabel}`}
          title="מחיקה"
          className={`${iconButtonClasses} hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400`}
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </li>
  );
}
