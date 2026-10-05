"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  LiveGuestCards,
  LiveSummaryTiles,
} from "@/components/LiveEventDashboard";
import LiveFloorPlanModal from "@/components/LiveFloorPlanModal";
import LiveReassignTableModal from "@/components/LiveReassignTableModal";
import LiveTablesOverview from "@/components/LiveTablesOverview";
import LiveWalkInModal from "@/components/LiveWalkInModal";
import ReadOnlySeatingMap from "@/components/ReadOnlySeatingMap";
import EventDataStatus from "@/components/EventDataStatus";
import { useEventData, useEventEngine } from "@/lib/eventEngine";
import { formatTableLabel } from "@/lib/tableDisplay";
import type { Guest } from "@/types/guest";

type LiveTab = "guests" | "tables";

export default function LiveCheckInPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  // Polls so check-ins made on other devices (e.g. guests' own phones via the
  // self check-in QR) show up on the hostess screen.
  const dataStatus = useEventData(id, { refreshIntervalMs: 5000 });
  const { getEvent, getGuests, setGuests, getTables, getZones } =
    useEventEngine();
  const event = getEvent(id);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<LiveTab>("guests");
  const [isWalkInOpen, setIsWalkInOpen] = useState(false);
  const [isFloorPlanOpen, setIsFloorPlanOpen] = useState(false);
  const [reassigningGuestId, setReassigningGuestId] = useState<string | null>(
    null,
  );
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const guests = getGuests(id);
  const tables = getTables(id);

  function handleToggleArrived(guestId: string) {
    setGuests(id, (prev) =>
      prev.map((guest) =>
        guest.id === guestId
          ? { ...guest, arrived: !guest.arrived, arrivedCount: undefined }
          : guest,
      ),
    );
  }

  function handleAddWalkIn(guest: Guest) {
    setGuests(id, (prev) => [...prev, guest]);
    setIsWalkInOpen(false);
    const table =
      guest.seatingAssignment &&
      tables.find((t) => t.id === guest.seatingAssignment?.id);
    setToast(
      table
        ? `${guest.name} נוסף/ה · ${formatTableLabel(table)}`
        : `${guest.name} נוסף/ה ללא שולחן`,
    );
  }

  function handleReassignTable(guestId: string, tableId: string) {
    const guest = guests.find((g) => g.id === guestId);
    const table = tables.find((t) => t.id === tableId);
    setGuests(id, (prev) =>
      prev.map((g) =>
        g.id === guestId
          ? { ...g, seatingAssignment: { kind: "table", id: tableId } }
          : g,
      ),
    );
    setReassigningGuestId(null);
    if (guest && table) {
      setToast(`${guest.name} הועבר/ה ל${formatTableLabel(table)}`);
    }
  }

  const reassigningGuest =
    reassigningGuestId !== null
      ? (guests.find((g) => g.id === reassigningGuestId) ?? null)
      : null;

  if (dataStatus !== "ready") return <EventDataStatus status={dataStatus} />;

  const tabClasses = (active: boolean) =>
    `h-14 min-w-0 flex-1 touch-manipulation rounded-xl px-2 text-sm leading-tight font-bold transition sm:px-3 sm:text-base ${
      active
        ? "bg-indigo-600 text-white shadow"
        : "text-zinc-700 dark:text-zinc-300"
    }`;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 pb-20">
      
      {/* HEADER - רגיל לחלוטין, לא צף ולא נדבק. זה ימנע את החפיפה בוודאות */}
      <header className="bg-white border-b border-gray-200 px-3 pt-[max(1rem,env(safe-area-inset-top))] pb-4 shadow-sm sm:px-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold text-zinc-900 dark:text-zinc-50">
              קבלת אורחים
            </h1>
            {event && (
              <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                {event.coupleNames} · {event.venue}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setIsFloorPlanOpen(true)}
              aria-label="הצג סקיצת אולם"
              title="הצג סקיצת אולם"
              className="flex h-14 min-h-[56px] min-w-[56px] touch-manipulation items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-3 text-base font-bold text-white shadow-md transition hover:bg-indigo-700 active:scale-[0.97] sm:px-4"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6" aria-hidden="true">
                <path fillRule="evenodd" d="M8.157 2.176a1.5 1.5 0 0 0-1.147 0l-4.084 1.69A1.5 1.5 0 0 0 2 5.25v10.877a1.5 1.5 0 0 0 2.074 1.386l3.51-1.452 4.26 1.762a1.5 1.5 0 0 0 1.146 0l4.083-1.69A1.5 1.5 0 0 0 18 14.75V3.872a1.5 1.5 0 0 0-2.073-1.386l-3.51 1.452-4.26-1.762ZM7.58 5a.75.75 0 0 1 .75.75v6.5a.75.75 0 0 1-1.5 0v-6.5A.75.75 0 0 1 7.58 5Zm5.59 2.75a.75.75 0 0 0-1.5 0v6.5a.75.75 0 0 0 1.5 0v-6.5Z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline">הצג סקיצת אולם</span>
            </button>
            <button
              type="button"
              onClick={() => setIsWalkInOpen(true)}
              className="flex h-14 min-h-[56px] touch-manipulation items-center gap-2 rounded-2xl bg-emerald-600 px-4 text-base font-bold text-white shadow-md transition hover:bg-emerald-700 active:scale-[0.97]"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6" aria-hidden="true">
                <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
              </svg>
              <span className="hidden sm:inline">הוספת אורח מהירה</span>
              <span className="max-[359px]:sr-only sm:hidden">הוספת אורח</span>
            </button>
            <button
              type="button"
              onClick={() => router.push("/live")}
              aria-label="חזרה לבחירת אירוע"
              className="grid h-12 w-12 shrink-0 touch-manipulation place-items-center rounded-full text-zinc-400 hover:bg-zinc-100 sm:h-14 sm:w-14 dark:hover:bg-zinc-800"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          </div>
        </div>
        <label className="flex h-14 min-h-[56px] items-center gap-3 rounded-xl border border-zinc-300 bg-white px-4 shadow-sm focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/30 dark:border-zinc-700 dark:bg-zinc-800">
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6 text-zinc-400">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
          </svg>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="חיפוש אורח..."
            className="h-full min-w-0 flex-1 bg-transparent text-base outline-none"
          />
        </label>
        <div
          role="tablist"
          aria-label="תצוגה"
          className="mt-3 flex gap-1 rounded-2xl bg-zinc-100 p-1 dark:bg-zinc-800"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "guests"}
            onClick={() => setActiveTab("guests")}
            className={tabClasses(activeTab === "guests")}
          >
            קבלת אורחים
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "tables"}
            onClick={() => setActiveTab("tables")}
            className={tabClasses(activeTab === "tables")}
          >
            תמונת מצב שולחנות
          </button>
        </div>
      </header>

      {/* MAIN CONTENT - בלוק שמתחיל מיד אחרי ההדר עם ריווח למעלה */}
      <main className="mx-auto max-w-7xl px-3 pt-4 sm:px-4 sm:pt-8 md:px-6">
        <div className="mb-4 sm:mb-8">
          <LiveSummaryTiles guests={guests} tables={tables} />
        </div>

        {activeTab === "tables" ? (
          <LiveTablesOverview
            guests={guests}
            tables={tables}
            searchQuery={searchQuery}
            onToggleArrived={handleToggleArrived}
            onChangeTable={setReassigningGuestId}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
              <LiveGuestCards
                guests={guests}
                tables={tables}
                searchQuery={searchQuery}
                onToggleArrived={handleToggleArrived}
                onChangeTable={setReassigningGuestId}
              />
            </div>

            <div className="mt-8 w-full sm:mt-12">
              <h2 className="mb-4 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                מפת הושבה (לצפייה בלבד)
              </h2>
              <ReadOnlySeatingMap
                tables={tables}
                zones={getZones(id)}
                guests={guests}
              />
            </div>
          </>
        )}
      </main>

      {isWalkInOpen && (
        <LiveWalkInModal
          guests={guests}
          tables={tables}
          onAdd={handleAddWalkIn}
          onClose={() => setIsWalkInOpen(false)}
        />
      )}

      {isFloorPlanOpen && (
        <LiveFloorPlanModal
          eventId={id}
          onClose={() => setIsFloorPlanOpen(false)}
        />
      )}

      {reassigningGuest && (
        <LiveReassignTableModal
          guest={reassigningGuest}
          guests={guests}
          tables={tables}
          onReassign={handleReassignTable}
          onClose={() => setReassigningGuestId(null)}
        />
      )}

      {toast && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-40 mx-auto max-w-md rounded-2xl bg-zinc-900 px-5 py-4 text-center text-lg font-bold text-white shadow-2xl ring-1 ring-white/10 dark:bg-zinc-100 dark:text-zinc-900"
        >
          ✓ {toast}
        </div>
      )}
    </div>
  );
}