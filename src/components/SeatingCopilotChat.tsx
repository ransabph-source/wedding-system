"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { extractLastName, findBestTable } from "@/lib/aiSeatingMock";
import { getNextTableNumber } from "@/lib/tableDisplay";
import type { Guest } from "@/types/guest";
import type { SeatingTable, SeatingZone } from "@/types/seating";

interface SeatingCopilotChatProps {
  guests: Guest[];
  tables: SeatingTable[];
  zones: SeatingZone[];
  onAddTables: (tables: SeatingTable[]) => void;
  onDeleteTable: (tableId: string) => void;
  onBulkSeatGuests: (
    assignments: { guestId: string; tableId: string }[],
  ) => void;
}

// A table holding this many guests (or fewer) is considered "sparse" and a
// candidate to be emptied out and closed during consolidation.
const SPARSE_TABLE_THRESHOLD = 4;

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
}

const GREETING: ChatMessage = {
  id: "greeting",
  role: "assistant",
  text: 'שלום! אני סייען ההושבה. אפשר לבקש ממני למשל "שים את כל משפחת סבג ביחד" או "עזור לצמצם מקומות ריקים".',
};

export default function SeatingCopilotChat({
  guests,
  tables,
  zones,
  onAddTables,
  onDeleteTable,
  onBulkSeatGuests,
}: SeatingCopilotChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [inputValue, setInputValue] = useState("");
  const historyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  function handleFamilyGroupingCommand(text: string): string {
    const unseatedGuests = guests.filter(
      (guest) => guest.seatingAssignment === null,
    );

    // Try to detect an actual last name mentioned in the message (based on
    // last names present among the unseated guests); fall back to the
    // literal "סבג" example from the request if none is mentioned.
    const unseatedLastNames = new Set(
      unseatedGuests
        .map((guest) => extractLastName(guest.name))
        .filter((lastName) => lastName.length > 0),
    );
    const mentionedLastName = [...unseatedLastNames].find((lastName) =>
      text.includes(lastName),
    );
    const targetLastName = mentionedLastName ?? "סבג";

    const familyGuests = unseatedGuests.filter(
      (guest) => extractLastName(guest.name) === targetLastName,
    );

    if (familyGuests.length === 0) {
      return `לא מצאתי אורחים ללא שולחן עם שם המשפחה "${targetLastName}".`;
    }

    const totalPartySize = familyGuests.reduce(
      (sum, guest) => sum + guest.partySize,
      0,
    );
    const newTable: SeatingTable = {
      id: crypto.randomUUID(),
      name: String(getNextTableNumber(tables)),
      capacity: Math.max(12, totalPartySize),
      shape: "round",
      isReserved: false,
    };

    onAddTables([newTable]);
    onBulkSeatGuests(
      familyGuests.map((guest) => ({
        guestId: guest.id,
        tableId: newTable.id,
      })),
    );

    return `מעולה, ריכזתי את כל משפחת ${targetLastName} בשולחן נפרד.`;
  }

  function handleConsolidationCommand(): string {
    // Tables that belong to a zone are managed as a group elsewhere in the
    // UI (no per-table delete affordance there), so leave them untouched.
    const groupedTableIds = new Set(zones.flatMap((zone) => zone.tableIds));
    const consolidatableTables = tables.filter(
      (table) => !table.isReserved && !groupedTableIds.has(table.id),
    );

    const seatedAtTable = (tableId: string) =>
      guests.filter(
        (guest) =>
          guest.seatingAssignment?.kind === "table" &&
          guest.seatingAssignment.id === tableId,
      );

    const originalOccupancy = new Map<string, number>();
    const originalGroups = new Map<string, Set<string>>();
    const remainingCapacity = new Map<string, number>();
    for (const table of consolidatableTables) {
      const occupants = seatedAtTable(table.id);
      const occupied = occupants.reduce((sum, g) => sum + g.partySize, 0);
      originalOccupancy.set(table.id, occupied);
      originalGroups.set(
        table.id,
        new Set(occupants.map((g) => g.group)),
      );
      remainingCapacity.set(table.id, table.capacity - occupied);
    }

    // Sparse = has guests, but few of them. Emptiest first, so small
    // tables feed into the next-smallest one that has room, chain-style.
    const sparseTables = consolidatableTables
      .filter((table) => {
        const occupied = originalOccupancy.get(table.id) ?? 0;
        return occupied > 0 && occupied <= SPARSE_TABLE_THRESHOLD;
      })
      .sort(
        (a, b) =>
          (originalOccupancy.get(a.id) ?? 0) -
          (originalOccupancy.get(b.id) ?? 0),
      );

    if (sparseTables.length === 0) {
      return `בדקתי, ולא מצאתי שולחנות דלילים (עד ${SPARSE_TABLE_THRESHOLD} אורחים) שאפשר לצמצם כרגע.`;
    }

    const assignments: { guestId: string; tableId: string }[] = [];
    const finalOccupancy = new Map(originalOccupancy);
    const alreadyReceivedGuests = new Set<string>();

    for (const sourceTable of sparseTables) {
      // This table absorbed guests from an even-smaller table earlier in
      // this same run - treat it as a stable merge target, not a source.
      if (alreadyReceivedGuests.has(sourceTable.id)) continue;

      for (const guest of seatedAtTable(sourceTable.id)) {
        // Destinations must already be "fuller" (occupied) tables - moving
        // to a still-empty table wouldn't reduce the number of tables in use.
        const fullerTables = consolidatableTables.filter(
          (table) =>
            table.id !== sourceTable.id &&
            (originalOccupancy.get(table.id) ?? 0) > 0,
        );
        const sameGroupTables = fullerTables.filter((table) =>
          originalGroups.get(table.id)?.has(guest.group),
        );

        const destinationId =
          findBestTable(sameGroupTables, remainingCapacity, guest.partySize) ??
          findBestTable(fullerTables, remainingCapacity, guest.partySize);

        if (!destinationId) continue;

        assignments.push({ guestId: guest.id, tableId: destinationId });
        remainingCapacity.set(
          destinationId,
          (remainingCapacity.get(destinationId) ?? 0) - guest.partySize,
        );
        finalOccupancy.set(
          destinationId,
          (finalOccupancy.get(destinationId) ?? 0) + guest.partySize,
        );
        finalOccupancy.set(
          sourceTable.id,
          (finalOccupancy.get(sourceTable.id) ?? 0) - guest.partySize,
        );
        alreadyReceivedGuests.add(destinationId);
      }
    }

    if (assignments.length === 0) {
      return "מצאתי שולחנות דלילים, אך לא נמצא להם מקום פנוי בשולחנות אחרים כרגע.";
    }

    const tableIdsToClose = sparseTables
      .filter((table) => (finalOccupancy.get(table.id) ?? 0) === 0)
      .map((table) => table.id);

    onBulkSeatGuests(assignments);
    tableIdsToClose.forEach((tableId) => onDeleteTable(tableId));

    return "ביצעתי צמצום! העברתי אורחים משולחנות ריקים למחצה לשולחנות מלאים יותר, וסגרתי שולחנות מיותרים.";
  }

  function processCommand(text: string): string {
    if (text.includes("סבג") || text.includes("ביחד")) {
      return handleFamilyGroupingCommand(text);
    }
    if (text.includes("צמצם") || text.includes("מקומות ריקים")) {
      return handleConsolidationCommand();
    }
    return 'לא הבנתי את הבקשה. אפשר לנסות למשל "שים את כל משפחת סבג ביחד" או "עזור לצמצם מקומות ריקים".';
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text: trimmed,
    };
    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      text: processCommand(trimmed),
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInputValue("");
  }

  return (
    <>
      {isOpen && (
        <div className="fixed inset-x-2 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 flex h-[min(32rem,calc(100dvh-7rem))] flex-col overflow-hidden rounded-3xl sm:inset-x-auto sm:bottom-24 sm:start-6 sm:w-[22rem] bg-white shadow-2xl ring-1 ring-black/5 dark:bg-zinc-900">
          <div className="flex items-center justify-between gap-2 bg-gradient-to-l from-fuchsia-600 via-violet-600 to-indigo-600 px-4 py-3.5 text-white">
            <div className="flex items-center gap-2">
              <span className="text-lg">✨</span>
              <span className="font-bold">סייען הושבה AI</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="סגירת הצ׳אט"
              className="grid h-10 w-10 place-items-center rounded-full transition hover:bg-white/20"
            >
              ✕
            </button>
          </div>

          <div
            ref={historyRef}
            className="flex flex-1 flex-col gap-2 overflow-y-auto p-4"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                    message.role === "user"
                      ? "bg-indigo-600 text-white"
                      : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
                  }`}
                >
                  {message.text}
                </div>
              </div>
            ))}
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 border-t border-zinc-100 p-3 dark:border-zinc-800"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="לדוגמה: שים את כל משפחת סבג ביחד"
              className="flex-1 rounded-full border border-zinc-300 bg-zinc-50 px-4 py-2 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            />
            <button
              type="submit"
              disabled={!inputValue.trim()}
              aria-label="שליחה"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-l from-fuchsia-600 via-violet-600 to-indigo-600 text-white transition disabled:cursor-not-allowed disabled:opacity-40"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
              </svg>
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? "סגירת סייען ההושבה" : "פתיחת סייען ההושבה"}
        className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] start-4 z-40 grid h-14 w-14 sm:bottom-6 sm:start-6 place-items-center rounded-full bg-gradient-to-l from-fuchsia-600 via-violet-600 to-indigo-600 text-2xl text-white shadow-lg shadow-violet-500/40 transition hover:shadow-xl hover:shadow-violet-500/50 active:scale-95"
      >
        {isOpen ? "✕" : "✨"}
      </button>
    </>
  );
}
