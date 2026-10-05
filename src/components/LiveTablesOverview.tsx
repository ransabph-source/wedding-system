"use client";

import { useState } from "react";
import { getArrivedCount } from "@/lib/guestRsvp";
import { guestMatchesQuery } from "@/lib/guestSearch";
import { formatTableLabel } from "@/lib/tableDisplay";
import { getTableOccupancy, type TableOccupancy } from "@/lib/tableOccupancy";
import type { Guest } from "@/types/guest";
import type { SeatingTable } from "@/types/seating";

interface LiveTablesOverviewProps {
  guests: Guest[];
  tables: SeatingTable[];
  searchQuery: string;
  onToggleArrived: (guestId: string) => void;
  onChangeTable: (guestId: string) => void;
}

type TableFilter = "all" | "available";

function freeSeatsBadge(freeSeats: number) {
  if (freeSeats > 0) {
    return {
      value: freeSeats,
      caption: "פנויים",
      classes: "bg-emerald-600 text-white",
    };
  }
  if (freeSeats === 0) {
    return {
      value: 0,
      caption: "מלא",
      classes: "bg-zinc-300 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100",
    };
  }
  return {
    value: `+${-freeSeats}`,
    caption: "חריגה",
    classes: "bg-rose-600 text-white",
  };
}

export default function LiveTablesOverview({
  guests,
  tables,
  searchQuery,
  onToggleArrived,
  onChangeTable,
}: LiveTablesOverviewProps) {
  const [filter, setFilter] = useState<TableFilter>("all");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(),
  );

  const occupancy = getTableOccupancy(tables, guests);
  const totalFreeSeats = occupancy.reduce(
    (sum, entry) => sum + Math.max(0, entry.freeSeats),
    0,
  );
  const tablesWithSpace = occupancy.filter((entry) => entry.freeSeats > 0);

  const query = searchQuery.trim();
  // While searching, a table matches by its own name or by a guest seated at
  // it, and tables matched by a guest open up to show them.
  function matchingGuestIds(entry: TableOccupancy): Set<string> {
    if (!query) return new Set();
    return new Set(
      entry.guests
        .filter((guest) => guestMatchesQuery(guest, query))
        .map((guest) => guest.id),
    );
  }

  const visible = occupancy
    .filter((entry) => filter === "all" || entry.freeSeats > 0)
    .map((entry) => ({ entry, matches: matchingGuestIds(entry) }))
    .filter(
      ({ entry, matches }) =>
        !query ||
        matches.size > 0 ||
        formatTableLabel(entry.table).includes(query),
    );

  function toggleExpanded(tableId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(tableId)) next.delete(tableId);
      else next.add(tableId);
      return next;
    });
  }

  const filterButtonClasses = (active: boolean) =>
    `h-14 flex-1 touch-manipulation rounded-xl px-4 text-base font-bold transition ${
      active
        ? "bg-white text-zinc-900 shadow dark:bg-zinc-700 dark:text-white"
        : "text-zinc-600 dark:text-zinc-300"
    }`;

  if (tables.length === 0) {
    return (
      <p className="rounded-2xl bg-white px-6 py-10 text-center text-lg text-zinc-500 shadow-md ring-1 ring-black/5 dark:bg-zinc-900 dark:text-zinc-400">
        עדיין לא הוגדרו שולחנות לאירוע
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-emerald-600 p-4 text-center text-white shadow-md">
          <p className="text-4xl font-extrabold tabular-nums">
            {totalFreeSeats}
          </p>
          <p className="text-sm font-semibold">כיסאות פנויים</p>
        </div>
        <div className="rounded-2xl bg-white p-4 text-center shadow-md ring-1 ring-black/5 dark:bg-zinc-900 dark:ring-white/10">
          <p className="text-4xl font-extrabold tabular-nums text-zinc-900 dark:text-zinc-50">
            {tablesWithSpace.length}
            <span className="text-xl text-zinc-400">/{tables.length}</span>
          </p>
          <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
            שולחנות עם מקום
          </p>
        </div>
      </div>

      <div
        role="group"
        aria-label="סינון שולחנות"
        className="flex gap-1 rounded-2xl bg-zinc-200 p-1 dark:bg-zinc-800"
      >
        <button
          type="button"
          aria-pressed={filter === "all"}
          onClick={() => setFilter("all")}
          className={filterButtonClasses(filter === "all")}
        >
          כל השולחנות
        </button>
        <button
          type="button"
          aria-pressed={filter === "available"}
          onClick={() => setFilter("available")}
          className={filterButtonClasses(filter === "available")}
        >
          רק עם מקום פנוי
        </button>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-2xl bg-white px-6 py-10 text-center text-lg text-zinc-500 shadow-md ring-1 ring-black/5 dark:bg-zinc-900 dark:text-zinc-400">
          {query ? "לא נמצאו שולחנות התואמים לחיפוש" : "אין שולחנות עם מקום פנוי"}
        </p>
      ) : (
        <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visible.map(({ entry, matches }) => {
            const { table, guests: tableGuests, seated, arrived, freeSeats } =
              entry;
            const isExpanded = expandedIds.has(table.id) || matches.size > 0;
            const badge = freeSeatsBadge(freeSeats);
            const fillPercent =
              table.capacity > 0
                ? Math.min(100, (seated / table.capacity) * 100)
                : 100;
            const label = formatTableLabel(table);
            const panelId = `live-table-${table.id}`;

            return (
              <div
                key={table.id}
                className={`overflow-hidden rounded-2xl bg-white shadow-md ring-1 dark:bg-zinc-900 ${
                  freeSeats < 0
                    ? "ring-2 ring-rose-500"
                    : "ring-black/5 dark:ring-white/10"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleExpanded(table.id)}
                  aria-expanded={isExpanded}
                  aria-controls={panelId}
                  className="flex w-full touch-manipulation items-center gap-4 p-4 text-right transition active:bg-zinc-50 dark:active:bg-zinc-800"
                >
                  <div
                    className={`flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl ${badge.classes}`}
                  >
                    <span className="text-3xl font-extrabold leading-none tabular-nums">
                      {badge.value}
                    </span>
                    <span className="mt-1 text-xs font-bold">
                      {badge.caption}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xl font-bold text-zinc-900 dark:text-zinc-50">
                        {label}
                      </p>
                      {table.isReserved && (
                        <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                          רזרבה
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-base font-semibold text-zinc-700 dark:text-zinc-200">
                      <span className="tabular-nums" dir="ltr">
                        {seated}/{table.capacity}
                      </span>{" "}
                      משובצים · הגיעו{" "}
                      <span className="tabular-nums">{arrived}</span>
                    </p>
                    <div
                      className="mt-2 h-2.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700"
                      aria-hidden="true"
                    >
                      <div
                        className={`h-full rounded-full ${
                          freeSeats < 0
                            ? "bg-rose-500"
                            : freeSeats === 0
                              ? "bg-zinc-500"
                              : "bg-emerald-500"
                        }`}
                        style={{ width: `${fillPercent}%` }}
                      />
                    </div>
                  </div>

                  <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                    className={`h-7 w-7 shrink-0 text-zinc-400 transition ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>

                {isExpanded && (
                  <div
                    id={panelId}
                    className="border-t border-zinc-100 px-3 py-3 dark:border-zinc-800"
                  >
                    {tableGuests.length === 0 ? (
                      <p className="py-3 text-center text-base text-zinc-500 dark:text-zinc-400">
                        אין אורחים משובצים לשולחן הזה
                      </p>
                    ) : (
                      <ul className="flex flex-col gap-2">
                        {tableGuests.map((guest) => (
                          <li
                            key={guest.id}
                            className={`flex items-center gap-2 rounded-xl px-2.5 py-2 sm:gap-3 sm:px-3 ${
                              matches.has(guest.id)
                                ? "bg-yellow-100 dark:bg-yellow-500/15"
                                : "bg-zinc-50 dark:bg-zinc-800/60"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-lg font-bold text-zinc-900 dark:text-zinc-50">
                                {guest.name}
                              </p>
                              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                                {guest.partySize > 1
                                  ? `${guest.partySize} אורחים`
                                  : "אורח/ת יחיד/ה"}
                                {guest.arrived &&
                                  getArrivedCount(guest) !== guest.partySize &&
                                  ` · הגיעו ${getArrivedCount(guest)}`}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => onChangeTable(guest.id)}
                              aria-label={`שינוי שיבוץ של ${guest.name}`}
                              title="שינוי שיבוץ"
                              className="grid h-14 w-14 shrink-0 touch-manipulation place-items-center rounded-xl bg-indigo-100 text-indigo-700 transition active:scale-[0.97] dark:bg-indigo-500/15 dark:text-indigo-300"
                            >
                              <svg
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                aria-hidden="true"
                                className="h-6 w-6"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M13.2 2.24a.75.75 0 0 0 .04 1.06l2.1 1.95H6.75a.75.75 0 0 0 0 1.5h8.59l-2.1 1.95a.75.75 0 1 0 1.02 1.1l3.5-3.25a.75.75 0 0 0 0-1.1l-3.5-3.25a.75.75 0 0 0-1.06.04Zm-6.4 8a.75.75 0 0 0-1.06-.04l-3.5 3.25a.75.75 0 0 0 0 1.1l3.5 3.25a.75.75 0 1 0 1.02-1.1l-2.1-1.95h8.59a.75.75 0 0 0 0-1.5H4.66l2.1-1.95a.75.75 0 0 0 .04-1.06Z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => onToggleArrived(guest.id)}
                              aria-pressed={guest.arrived}
                              aria-label={
                                guest.arrived
                                  ? `ביטול הגעה של ${guest.name}`
                                  : `סימון הגעה של ${guest.name}`
                              }
                              className={`h-14 min-w-24 shrink-0 touch-manipulation rounded-xl px-2.5 text-base font-bold sm:min-w-28 sm:px-3 transition active:scale-[0.97] ${
                                guest.arrived
                                  ? "bg-emerald-500 text-white"
                                  : "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100"
                              }`}
                            >
                              {guest.arrived ? "✓ הגיע/ה" : "סימון הגעה"}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
