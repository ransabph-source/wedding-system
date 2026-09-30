"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  LiveGuestCards,
  LiveSummaryTiles,
} from "@/components/LiveEventDashboard";
import ReadOnlySeatingMap from "@/components/ReadOnlySeatingMap";
import { useEventEngine } from "@/lib/eventEngine";
import { getEventById } from "@/lib/mockEvents";
import { DEFAULT_TABLES } from "@/lib/seatingTables";

export default function LiveCheckInPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const event = getEventById(id);
  const { getGuests, setGuests } = useEventEngine();
  const [searchQuery, setSearchQuery] = useState("");

  const guests = getGuests(id);

  function handleToggleArrived(guestId: string) {
    setGuests(id, (prev) =>
      prev.map((guest) =>
        guest.id === guestId
          ? { ...guest, arrived: !guest.arrived, arrivedCount: undefined }
          : guest,
      ),
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 pb-20">
      
      {/* HEADER - רגיל לחלוטין, לא צף ולא נדבק. זה ימנע את החפיפה בוודאות */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
              קבלת אורחים
            </h1>
            {event && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {event.coupleNames} · {event.venue}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => router.push("/")}
            aria-label="יציאה"
            className="grid h-14 w-14 min-h-[56px] min-w-[56px] place-items-center rounded-full text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
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
      </header>

      {/* MAIN CONTENT - בלוק שמתחיל מיד אחרי ההדר עם ריווח למעלה */}
      <main className="mx-auto max-w-7xl px-4 pt-8 md:px-6">
        
        <div className="mb-8">
          <LiveSummaryTiles guests={guests} tables={DEFAULT_TABLES} />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <LiveGuestCards
            guests={guests}
            tables={DEFAULT_TABLES}
            searchQuery={searchQuery}
            onToggleArrived={handleToggleArrived}
          />
        </div>

        <div className="mt-12 w-full">
          <h2 className="mb-4 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
            מפת הושבה (לצפייה בלבד)
          </h2>
          <ReadOnlySeatingMap
            tables={DEFAULT_TABLES}
            zones={[]}
            guests={guests}
          />
        </div>
        
      </main>
    </div>
  );
}