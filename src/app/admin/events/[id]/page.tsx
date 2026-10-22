"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AdminTableManager, {
  type TableUpdates,
} from "@/components/AdminTableManager";
import EventDataStatus from "@/components/EventDataStatus";
import GuestTable from "@/components/GuestTable";
import SearchBar from "@/components/SearchBar";
import SendMessagesModal from "@/components/SendMessagesModal";
import { useEventData, useEventEngine } from "@/lib/eventEngine";
import { PHASE_BADGE_CLASSES, PHASE_LABELS } from "@/lib/eventPhaseRules";
import { hasPhoneNumber } from "@/lib/guestRsvp";
import { guestMatchesQuery } from "@/lib/guestSearch";
import { renumberTablesAfterDelete } from "@/lib/tableDisplay";
import type { SeatingTable } from "@/types/seating";
import AutomationTimeline from "./AutomationTimeline";

// The admin's view of one event: the parts of the managed service couples
// can't do themselves, i.e. sending WhatsApp RSVP messages and setting up the
// tables they seat guests at. Everything else is on the couple's page, which
// admins can open from here.

const NO_GROUPS: string[] = [];

function noop() {}

const sectionClasses =
  "rounded-xl bg-white p-3 shadow-md ring-1 ring-black/5 sm:p-4 dark:bg-zinc-900";

const linkButtonClasses =
  "flex min-h-10 items-center justify-center rounded-lg px-3 py-1.5 text-sm font-semibold transition sm:min-h-0 sm:text-xs";

export default function AdminEventPage() {
  const { id } = useParams<{ id: string }>();
  const dataStatus = useEventData(id, { refreshIntervalMs: 15000 });
  const {
    getEvent,
    getPhase,
    getGuests,
    setGuests,
    getTables,
    setTables,
    getZones,
    setZones,
  } = useEventEngine();
  // Guest IDs picked in the guest list when the dialog was opened from
  // there (empty when opened from the button); null while it's closed.
  const [messageGuestIds, setMessageGuestIds] = useState<string[] | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");

  const event = getEvent(id);
  const phase = getPhase(id);
  const guests = getGuests(id);
  const tables = getTables(id);
  const zones = getZones(id);
  const visibleGuests = guests.filter((guest) =>
    guestMatchesQuery(guest, searchQuery),
  );

  const awaitingAnswerCount = guests.filter(
    (guest) =>
      guest.rsvpStatus === "pending_whatsapp" ||
      guest.rsvpStatus === "needs_call",
  ).length;
  const withoutPhoneCount = guests.filter(
    (guest) => !hasPhoneNumber(guest),
  ).length;

  function handleAddTables(newTables: SeatingTable[]) {
    setTables(id, (prev) => [...prev, ...newTables]);
  }

  function handleUpdateTable(tableId: string, updates: TableUpdates) {
    setTables(id, (prev) =>
      prev.map((table) =>
        table.id === tableId ? { ...table, ...updates } : table,
      ),
    );
  }

  // Guests at the table go back to the unseated list, and the table leaves
  // any zone it was part of.
  function handleDeleteTable(tableId: string) {
    setTables(id, (prev) => {
      const deleted = prev.find((table) => table.id === tableId);
      const remaining = prev.filter((table) => table.id !== tableId);
      return deleted ? renumberTablesAfterDelete(remaining, deleted) : remaining;
    });
    setGuests(id, (prev) =>
      prev.map((guest) =>
        guest.seatingAssignment?.kind === "table" &&
        guest.seatingAssignment.id === tableId
          ? { ...guest, seatingAssignment: null }
          : guest,
      ),
    );
    if (zones.some((zone) => zone.tableIds.includes(tableId))) {
      setZones(id, (prev) =>
        prev.map((zone) =>
          zone.tableIds.includes(tableId)
            ? { ...zone, tableIds: zone.tableIds.filter((t) => t !== tableId) }
            : zone,
        ),
      );
    }
  }

  if (dataStatus !== "ready") return <EventDataStatus status={dataStatus} />;

  return (
    <div className="px-3 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Link
              href="/admin"
              className="text-xs font-medium text-zinc-500 hover:underline dark:text-zinc-400"
            >
              → חזרה לרשימת האירועים
            </Link>
            <h1 className="mt-1 truncate text-lg font-bold text-zinc-900 sm:text-xl dark:text-zinc-50">
              ניהול אירוע{event ? `: ${event.coupleNames}` : ""}
            </h1>
            {event && (
              <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                {event.venue} · {event.eventDate}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${PHASE_BADGE_CLASSES[phase]}`}
            >
              שלב: {PHASE_LABELS[phase]}
            </span>
            <Link
              href={`/couple/${id}`}
              className={`${linkButtonClasses} bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20`}
            >
              לוח הבקרה של הזוג
            </Link>
            <Link
              href={`/live/${id}`}
              className={`${linkButtonClasses} bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20`}
            >
              מסך לייב
            </Link>
          </div>
        </header>

        <section className={sectionClasses}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
                הודעות WhatsApp
              </h2>
              <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                {guests.length} מוזמנים · {awaitingAnswerCount} טרם השיבו ·{" "}
                {withoutPhoneCount} ללא מספר טלפון
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMessageGuestIds([])}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:bg-indigo-800 sm:min-h-0"
            >
              שליחת הודעות
            </button>
          </div>

          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            לשליחה לאורחים מסוימים, סמנו אותם ברשימה ולחצו &quot;שליחת
            הודעות&quot; בסרגל שנפתח.
          </p>
          <div className="mt-2 flex flex-col gap-2">
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
            {/* Read-only: the guest list itself is edited on the couple's
                page; here it's only for picking message recipients. */}
            <div className="max-h-[60vh] overflow-y-auto rounded-xl ring-1 ring-black/5">
              <GuestTable
                guests={visibleGuests}
                groups={NO_GROUPS}
                isFiltered={searchQuery.trim().length > 0}
                readOnly
                onUpdateGuest={noop}
                onDeleteGuest={noop}
                onSendMessages={setMessageGuestIds}
              />
            </div>
          </div>
        </section>

        {event && (
          <AutomationTimeline
            eventId={id}
            eventDate={event.eventDate}
            className={sectionClasses}
          />
        )}

        {messageGuestIds && (
          <SendMessagesModal
            eventId={id}
            guests={guests}
            selectedGuestIds={messageGuestIds}
            onClose={() => setMessageGuestIds(null)}
          />
        )}

        <section className="flex flex-col gap-2">
          <div>
            <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
              מבנה השולחנות
            </h2>
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              הזוג יכול רק לשבץ אורחים לשולחנות שמוגדרים כאן.
            </p>
          </div>
          <AdminTableManager
            tables={tables}
            zones={zones}
            guests={guests}
            onAddTables={handleAddTables}
            onUpdateTable={handleUpdateTable}
            onDeleteTable={handleDeleteTable}
          />
        </section>
      </div>
    </div>
  );
}
