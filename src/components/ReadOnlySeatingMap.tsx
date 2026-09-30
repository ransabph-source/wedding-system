import { getCategoryColorClasses } from "@/lib/categoryColors";
import { formatTableLabel } from "@/lib/tableDisplay";
import type { Guest } from "@/types/guest";
import type { SeatingTable, SeatingZone } from "@/types/seating";

interface ReadOnlySeatingMapProps {
  tables: SeatingTable[];
  zones: SeatingZone[];
  guests: Guest[];
}

function TableCard({ table, guests }: { table: SeatingTable; guests: Guest[] }) {
  const seatedCount = guests.reduce((sum, guest) => sum + guest.partySize, 0);

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-md ring-1 ring-black/5 dark:bg-zinc-900">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-semibold text-zinc-800 dark:text-zinc-100">
          {formatTableLabel(table)}
          {table.isReserved && (
            <span className="ms-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
              רזרבה
            </span>
          )}
        </h4>
        <span className="shrink-0 text-xs font-medium text-zinc-400 dark:text-zinc-500">
          {seatedCount}/{table.capacity}
        </span>
      </div>

      {guests.length === 0 ? (
        <p className="text-sm text-zinc-400 dark:text-zinc-500">ריק</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {guests.map((guest) => (
            <li
              key={guest.id}
              className="flex items-center justify-between gap-2 rounded-lg bg-zinc-50 px-2.5 py-1.5 text-sm dark:bg-zinc-800"
            >
              <span className="truncate font-medium text-zinc-700 dark:text-zinc-200">
                {guest.name}
                {guest.partySize > 1 && (
                  <span className="ms-1 text-xs font-normal text-zinc-500 dark:text-zinc-400">
                    ({guest.partySize})
                  </span>
                )}
              </span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${getCategoryColorClasses(guest.category)}`}
              >
                {guest.category}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ReadOnlySeatingMap({
  tables,
  zones,
  guests,
}: ReadOnlySeatingMapProps) {
  const groupedTableIds = new Set(zones.flatMap((zone) => zone.tableIds));
  const ungroupedTables = tables.filter(
    (table) => !groupedTableIds.has(table.id),
  );

  function guestsAtTable(tableId: string) {
    return guests.filter(
      (guest) =>
        guest.seatingAssignment?.kind === "table" &&
        guest.seatingAssignment.id === tableId,
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {zones.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            אזורי הושבה
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {zones.map((zone) => (
              <div
                key={zone.id}
                className="rounded-2xl border border-dashed border-zinc-300 p-3 dark:border-zinc-700"
              >
                <p className="mb-2 text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                  {zone.name}
                </p>
                <div className="flex flex-col gap-3">
                  {tables
                    .filter((table) => zone.tableIds.includes(table.id))
                    .map((table) => (
                      <TableCard
                        key={table.id}
                        table={table}
                        guests={guestsAtTable(table.id)}
                      />
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        {zones.length > 0 && (
          <h3 className="mb-3 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            שולחנות בודדים
          </h3>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ungroupedTables.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              guests={guestsAtTable(table.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
