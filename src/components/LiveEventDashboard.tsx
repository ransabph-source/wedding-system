"use client";

import { useMemo, type ReactNode } from "react";
import { getGroupColorClasses } from "@/lib/groupColors";
import { getArrivedCount } from "@/lib/guestRsvp";
import { guestMatchesQuery } from "@/lib/guestSearch";
import { formatTableLabel } from "@/lib/tableDisplay";
import type { Guest } from "@/types/guest";
import type { SeatingTable } from "@/types/seating";

interface LiveSummaryTilesProps {
  guests: Guest[];
  tables: SeatingTable[];
}

interface LiveGuestCardsProps {
  guests: Guest[];
  tables: SeatingTable[];
  searchQuery: string;
  onToggleArrived: (guestId: string) => void;
  onChangeTable: (guestId: string) => void;
}

interface SummaryCard {
  label: string;
  value: number;
  accentClasses: string;
  icon: ReactNode;
}

const PeopleIcon = (
  <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM1.49 15.326a.78.78 0 0 1-.358-.442 3 3 0 0 1 4.308-3.516 6.484 6.484 0 0 0-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 0 1-2.07-.655ZM16.44 15.98a4.97 4.97 0 0 0 2.07-.654.78.78 0 0 0 .357-.442 3 3 0 0 0-4.308-3.517 6.484 6.484 0 0 1 1.907 3.96 2.318 2.318 0 0 1-.026.654ZM18 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM5.304 16.19a.844.844 0 0 1-.277-.71 5 5 0 0 1 9.947 0 .843.843 0 0 1-.277.71A6.975 6.975 0 0 1 10 18a6.974 6.974 0 0 1-4.696-1.81Z" />
  </svg>
);

const CheckIcon = (
  <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path
      fillRule="evenodd"
      d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
      clipRule="evenodd"
    />
  </svg>
);

const ClockIcon = (
  <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path
      fillRule="evenodd"
      d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z"
      clipRule="evenodd"
    />
  </svg>
);

const ChairIcon = (
  <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path d="M5 2.75A.75.75 0 0 1 5.75 2h8.5a.75.75 0 0 1 .75.75V9H4.75V2.75ZM4 10.5h12a1 1 0 0 1 1 1V13a1 1 0 0 1-1 1h-.5v3.25a.75.75 0 0 1-1.5 0V14h-8v3.25a.75.75 0 0 1-1.5 0V14H4a1 1 0 0 1-1-1v-1.5a1 1 0 0 1 1-1Z" />
  </svg>
);

const PencilIcon = (
  <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-4 w-4 opacity-80">
    <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
  </svg>
);

function tableLabelForGuest(
  guest: Guest,
  tables: SeatingTable[],
): { label: string; assigned: boolean } {
  if (!guest.seatingAssignment) {
    return { label: "ללא שולחן", assigned: false };
  }
  if (guest.seatingAssignment.kind === "zone") {
    return { label: "אזור הושבה", assigned: true };
  }
  const table = tables.find((t) => t.id === guest.seatingAssignment?.id);
  return {
    label: table ? formatTableLabel(table) : "ללא שולחן",
    assigned: !!table,
  };
}

export function LiveSummaryTiles({ guests, tables }: LiveSummaryTilesProps) {
  const totalGuestsCount = guests.reduce(
    (sum, guest) => sum + guest.partySize,
    0,
  );
  const arrivedCount = guests.reduce(
    (sum, guest) => sum + getArrivedCount(guest),
    0,
  );
  const pendingCount = totalGuestsCount - arrivedCount;

  const totalCapacity = tables.reduce((sum, table) => sum + table.capacity, 0);
  const occupiedSeats = guests
    .filter((guest) => guest.seatingAssignment !== null)
    .reduce((sum, guest) => sum + guest.partySize, 0);
  const emptySeats = Math.max(0, totalCapacity - occupiedSeats);

  const cards: SummaryCard[] = [
    {
      label: 'סה"כ מוזמנים',
      value: totalGuestsCount,
      accentClasses:
        "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400",
      icon: PeopleIcon,
    },
    {
      label: "הגיעו",
      value: arrivedCount,
      accentClasses:
        "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
      icon: CheckIcon,
    },
    {
      label: "טרם הגיעו",
      value: pendingCount,
      accentClasses:
        "bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
      icon: ClockIcon,
    },
    {
      label: "כיסאות פנויים בשולחנות",
      value: emptySeats,
      accentClasses:
        "bg-sky-100 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400",
      icon: ChairIcon,
    },
  ];

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="flex flex-col items-center gap-1 rounded-2xl bg-white p-3 text-center shadow-md ring-1 ring-black/5 dark:bg-zinc-900"
        >
          <div
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${card.accentClasses}`}
          >
            <div className="h-4.5 w-4.5">{card.icon}</div>
          </div>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {card.label}
          </p>
          <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}

// Renders the guest cards as bare siblings so the page's grid lays them out.
export function LiveGuestCards({
  guests,
  tables,
  searchQuery,
  onToggleArrived,
  onChangeTable,
}: LiveGuestCardsProps) {
  const visibleGuests = useMemo(() => {
    return [...guests]
      .filter((guest) => guestMatchesQuery(guest, searchQuery))
      .sort((a, b) => a.name.localeCompare(b.name, "he"));
  }, [guests, searchQuery]);

  if (visibleGuests.length === 0) {
    return (
      <p className="col-span-full rounded-2xl bg-white px-6 py-10 text-center text-zinc-400 shadow-md ring-1 ring-black/5 dark:bg-zinc-900 dark:text-zinc-500">
        {searchQuery.trim().length > 0
          ? "לא נמצאו אורחים התואמים לחיפוש"
          : "עדיין לא נוספו אורחים"}
      </p>
    );
  }

  return (
    <>
      {visibleGuests.map((guest) => {
        const { label: tableLabel, assigned } = tableLabelForGuest(
          guest,
          tables,
        );

        return (
          <div
            key={guest.id}
            className={`rounded-2xl bg-white p-4 shadow-md ring-1 transition dark:bg-zinc-900 ${
              guest.arrived
                ? "ring-2 ring-emerald-400 dark:ring-emerald-500/60"
                : "ring-black/5"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xl font-bold text-zinc-900 dark:text-zinc-50">
                  {guest.name}
                </p>
                {guest.partySize > 1 && (
                  <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    {guest.partySize} אורחים
                  </p>
                )}
                <span
                  className={`mt-1.5 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getGroupColorClasses(guest.group)}`}
                >
                  {guest.group}
                </span>
              </div>

              <button
                type="button"
                onClick={() => onChangeTable(guest.id)}
                aria-label={`שינוי שיבוץ של ${guest.name} (${tableLabel})`}
                title="שינוי שיבוץ"
                className={`flex min-h-12 shrink-0 touch-manipulation items-center gap-1.5 rounded-xl px-3 text-sm font-extrabold whitespace-nowrap transition active:scale-[0.97] ${
                  assigned
                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                    : "bg-zinc-200 text-zinc-600 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
                }`}
              >
                {tableLabel}
                {PencilIcon}
              </button>
            </div>

            <button
              type="button"
              onClick={() => onToggleArrived(guest.id)}
              aria-pressed={guest.arrived}
              className={`mt-3 flex h-14 min-h-[56px] w-full touch-manipulation items-center justify-center gap-2 rounded-xl text-lg font-bold transition active:scale-[0.98] ${
                guest.arrived
                  ? "bg-emerald-500 text-white hover:bg-emerald-600"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              {guest.arrived ? "✓ הגיע/ה" : "סימון הגעה"}
            </button>
          </div>
        );
      })}
    </>
  );
}
