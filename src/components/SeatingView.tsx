"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import AiSmartSeatingModal from "@/components/AiSmartSeatingModal";
import CreateZoneForm from "@/components/CreateZoneForm";
import FloorPlanUploader from "@/components/FloorPlanUploader";
import GuestChip from "@/components/GuestChip";
import SeatingCopilotChat from "@/components/SeatingCopilotChat";
import SeatingTableCard from "@/components/SeatingTableCard";
import SeatingZoneCard from "@/components/SeatingZoneCard";
import UnseatedGuestsPanel from "@/components/UnseatedGuestsPanel";
import { guestMatchesQuery } from "@/lib/guestSearch";
import { SeatingPickProvider, type SeatingPick } from "@/lib/seatingPick";
import { formatTableLabel } from "@/lib/tableDisplay";
import type { Guest, SeatingAssignment } from "@/types/guest";
import type { SeatingTable, SeatingZone } from "@/types/seating";

interface SeatingViewProps {
  eventId: string;
  guests: Guest[];
  tables: SeatingTable[];
  zones: SeatingZone[];
  onEmptyTable: (tableId: string) => void;
  onCreateZone: (zone: SeatingZone) => void;
  onDeleteZone: (zoneId: string) => void;
  onSeatGuestToTable: (guestId: string, tableId: string) => void;
  onSeatGuestToZone: (guestId: string, zoneId: string) => void;
  onUnseatGuest: (guestId: string) => void;
  // A null tableId unseats the guest.
  onBulkSeatGuests: (
    assignments: { guestId: string; tableId: string | null }[],
  ) => void;
  onSwapTables: (tableAId: string, tableBId: string) => void;
  floorPlanUrl: string | null;
  isSavingFloorPlan?: boolean;
  floorPlanError?: string | null;
  onUploadFloorPlan: (file: File) => void;
  onRemoveFloorPlan: () => void;
  searchQuery: string;
}

// An action kept so it can be undone: a single-guest move (drag, tap-to-move
// or removing a guest from a table), or a swap of two tables' guests. Seats
// are full assignments rather than table IDs because guests can also sit in a
// zone or be unseated (null). A swap records who ended up at each table, so
// undo can tell whether the tables still look the way the swap left them.
type SeatingMove =
  | {
      kind: "guest";
      guestId: string;
      from: SeatingAssignment | null;
      to: SeatingAssignment | null;
    }
  | {
      kind: "swap";
      tableAId: string;
      tableBId: string;
      guestIdsAtA: string[];
      guestIdsAtB: string[];
    };

// Old moves are dropped beyond this; undo is for slips, not a full history.
const MAX_UNDO_MOVES = 50;

function sameAssignment(
  a: SeatingAssignment | null,
  b: SeatingAssignment | null,
) {
  return a?.kind === b?.kind && a?.id === b?.id;
}

function sameIds(a: string[], b: string[]) {
  const set = new Set(a);
  return a.length === b.length && b.every((id) => set.has(id));
}

function isEditableTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

export default function SeatingView({
  eventId,
  guests,
  tables,
  zones,
  onEmptyTable,
  onCreateZone,
  onDeleteZone,
  onSeatGuestToTable,
  onSeatGuestToZone,
  onUnseatGuest,
  onBulkSeatGuests,
  onSwapTables,
  floorPlanUrl,
  isSavingFloorPlan,
  floorPlanError,
  onUploadFloorPlan,
  onRemoveFloorPlan,
  searchQuery,
}: SeatingViewProps) {
  const [activeGuest, setActiveGuest] = useState<Guest | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [tableToSwap, setTableToSwap] = useState<string | null>(null);
  const [pickedGuestId, setPickedGuestId] = useState<string | null>(null);
  // Newest move last. Lives only in this screen: leaving the seating tab
  // clears it.
  const [undoStack, setUndoStack] = useState<SeatingMove[]>([]);
  const [swapToast, setSwapToast] = useState<{
    id: number;
    message: string;
    tableIds: string[];
  } | null>(null);
  // On touch screens a drag starts after a short press, so a normal swipe
  // still scrolls the guest list and the page.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
  );

  // Only guests who confirmed attendance (digitally or manually) are
  // available for seating; pending and declined guests stay out of the pool.
  const allUnseatedGuests = guests.filter(
    (guest) =>
      guest.seatingAssignment === null && guest.rsvpStatus === "confirmed",
  );
  const unseatedGuests = allUnseatedGuests.filter((guest) =>
    guestMatchesQuery(guest, searchQuery),
  );

  const groupedTableIds = new Set(zones.flatMap((zone) => zone.tableIds));
  const ungroupedTables = tables.filter(
    (table) => !groupedTableIds.has(table.id),
  );

  // Drops out of swap mode on its own if the picked table is removed or
  // folded into a zone while waiting for the second pick.
  const swapSourceTable =
    ungroupedTables.find((table) => table.id === tableToSwap) ?? null;

  const isChoosingSwapTarget = swapSourceTable !== null;

  // Drops the pick on its own if the guest is deleted meanwhile.
  const pickedGuest =
    guests.find((guest) => guest.id === pickedGuestId) ?? null;

  const isPickingOrSwapping = isChoosingSwapTarget || pickedGuest !== null;

  useEffect(() => {
    if (!isPickingOrSwapping) return;
    function handleKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key !== "Escape") return;
      setTableToSwap(null);
      setPickedGuestId(null);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPickingOrSwapping]);

  useEffect(() => {
    if (!swapToast) return;
    const timeout = window.setTimeout(() => setSwapToast(null), 2500);
    return () => window.clearTimeout(timeout);
  }, [swapToast]);

  function handleSwapClick(tableId: string) {
    setPickedGuestId(null);
    if (!swapSourceTable) {
      setTableToSwap(tableId);
      return;
    }
    if (swapSourceTable.id === tableId) {
      setTableToSwap(null);
      return;
    }
    const targetTable = tables.find((table) => table.id === tableId);
    if (!targetTable) return;

    const guestIdsAtSource = guestIdsAtTable(swapSourceTable.id);
    const guestIdsAtTarget = guestIdsAtTable(targetTable.id);
    onSwapTables(swapSourceTable.id, targetTable.id);
    setTableToSwap(null);
    // Swapping two empty tables changes nothing, so there's nothing to undo.
    if (guestIdsAtSource.length > 0 || guestIdsAtTarget.length > 0) {
      pushUndo({
        kind: "swap",
        tableAId: swapSourceTable.id,
        tableBId: targetTable.id,
        guestIdsAtA: guestIdsAtTarget,
        guestIdsAtB: guestIdsAtSource,
      });
    }
    showSwapToast(
      `האורחים ב${formatTableLabel(swapSourceTable)} וב${formatTableLabel(targetTable)} הוחלפו`,
      [swapSourceTable.id, targetTable.id],
    );
  }

  // A fresh id re-mounts the toast (restarting its entrance animation and
  // timer) when swaps happen back to back.
  function showSwapToast(message: string, tableIds: string[]) {
    setSwapToast((prev) => ({ id: (prev?.id ?? 0) + 1, message, tableIds }));
  }

  function guestIdsAtTable(tableId: string) {
    return guests
      .filter(
        (guest) =>
          guest.seatingAssignment?.kind === "table" &&
          guest.seatingAssignment.id === tableId,
      )
      .map((guest) => guest.id);
  }

  // Applies a seat change through the same handlers as drag-and-drop, so it
  // is saved the same way.
  function applyAssignment(guestId: string, to: SeatingAssignment | null) {
    if (!to) onUnseatGuest(guestId);
    else if (to.kind === "zone") onSeatGuestToZone(guestId, to.id);
    else onSeatGuestToTable(guestId, to.id);
  }

  function seatGuest(guestId: string, to: SeatingAssignment | null) {
    const guest = guests.find((g) => g.id === guestId);
    if (!guest || sameAssignment(guest.seatingAssignment, to)) return;
    applyAssignment(guestId, to);
    pushUndo({ kind: "guest", guestId, from: guest.seatingAssignment, to });
  }

  function pushUndo(move: SeatingMove) {
    setUndoStack((prev) => [...prev, move].slice(-MAX_UNDO_MOVES));
  }

  // Bulk changes move many guests at once, so older single moves may no
  // longer make sense on top of them.
  function clearUndo() {
    setUndoStack([]);
  }

  function seatExists(assignment: SeatingAssignment | null) {
    if (!assignment) return true;
    return assignment.kind === "zone"
      ? zones.some((zone) => zone.id === assignment.id)
      : tables.some((table) => table.id === assignment.id);
  }

  // Whether the seating still looks exactly the way the move left it. Undo
  // runs newest first, so as long as nobody else changed the seating, each
  // entry finds the state it expects once the ones after it are undone.
  function canUndo(move: SeatingMove) {
    if (move.kind === "guest") {
      const guest = guests.find((g) => g.id === move.guestId);
      return (
        guest !== undefined &&
        sameAssignment(guest.seatingAssignment, move.to) &&
        seatExists(move.from)
      );
    }
    return (
      seatExists({ kind: "table", id: move.tableAId }) &&
      seatExists({ kind: "table", id: move.tableBId }) &&
      sameIds(guestIdsAtTable(move.tableAId), move.guestIdsAtA) &&
      sameIds(guestIdsAtTable(move.tableBId), move.guestIdsAtB)
    );
  }

  function handleUndo() {
    const move = undoStack.at(-1);
    if (!move) return;
    // Someone else changed the seating meanwhile (another device, an admin
    // removing a table), so the history no longer matches; drop all of it
    // rather than undo onto the wrong state.
    if (!canUndo(move)) {
      clearUndo();
      return;
    }
    setUndoStack((prev) => prev.slice(0, -1));
    if (move.kind === "guest") {
      applyAssignment(move.guestId, move.from);
      return;
    }
    // Swapping the same two tables again puts everyone back.
    onSwapTables(move.tableAId, move.tableBId);
    setTableToSwap(null);
    const tableA = tables.find((table) => table.id === move.tableAId);
    const tableB = tables.find((table) => table.id === move.tableBId);
    if (tableA && tableB) {
      showSwapToast(
        `ההחלפה בין ${formatTableLabel(tableA)} ל${formatTableLabel(tableB)} בוטלה`,
        [tableA.id, tableB.id],
      );
    }
  }

  // Shared by drag-and-drop and tap-to-move. `targetId` is a droppable id.
  function moveGuest(guestId: string, targetId: string) {
    if (targetId === "unseated") {
      seatGuest(guestId, null);
      return;
    }

    const zone = zones.find((z) => z.id === targetId);
    if (zone) {
      seatGuest(guestId, { kind: "zone", id: zone.id });
      return;
    }

    const table = tables.find((t) => t.id === targetId);
    if (table) {
      seatGuest(guestId, { kind: "table", id: table.id });
    }
  }

  function handleRemoveGuest(guestId: string) {
    seatGuest(guestId, null);
  }

  function handleBulkSeatGuests(
    assignments: { guestId: string; tableId: string | null }[],
  ) {
    clearUndo();
    onBulkSeatGuests(assignments);
  }

  function handleEmptyTable(tableId: string) {
    clearUndo();
    onEmptyTable(tableId);
  }

  function handleCreateZone(zone: SeatingZone) {
    clearUndo();
    onCreateZone(zone);
  }

  function handleDeleteZone(zoneId: string) {
    clearUndo();
    onDeleteZone(zoneId);
  }

  // Ctrl+Z / Cmd+Z, except while typing (e.g. in the search box), where it
  // should undo the text instead. Re-registered each render so it always
  // sees the current stack and guests.
  useEffect(() => {
    function handleKeyDown(e: globalThis.KeyboardEvent) {
      if (
        e.key.toLowerCase() !== "z" ||
        !(e.ctrlKey || e.metaKey) ||
        e.shiftKey ||
        e.altKey ||
        isEditableTarget(e.target)
      ) {
        return;
      }
      e.preventDefault();
      handleUndo();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const seatingPick: SeatingPick = {
    pickedGuestId: pickedGuest?.id ?? null,
    togglePick: (guestId) => {
      setTableToSwap(null);
      setPickedGuestId((prev) => (prev === guestId ? null : guestId));
    },
    placePicked: (targetId) => {
      if (!pickedGuest) return;
      moveGuest(pickedGuest.id, targetId);
      setPickedGuestId(null);
    },
  };

  function handleDragStart(event: DragStartEvent) {
    setPickedGuestId(null);
    const guest = guests.find((g) => g.id === event.active.id);
    setActiveGuest(guest ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveGuest(null);
    const overId = event.over?.id;
    if (!overId) return;
    moveGuest(String(event.active.id), String(overId));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsAiModalOpen(true)}
            className="group relative isolate flex min-w-0 flex-1 items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-l from-fuchsia-600 via-violet-600 to-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-violet-500/40 transition hover:shadow-xl hover:shadow-violet-500/50 active:scale-[0.99]"
          >
            <span
              aria-hidden="true"
              className="absolute inset-0 -z-10 animate-pulse bg-gradient-to-l from-fuchsia-500 via-violet-500 to-indigo-500 opacity-70 blur-xl"
            />
            <span>✨</span>
            <span>שיבוץ חכם (AI)</span>
          </button>

          <button
            type="button"
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            title="בטל פעולה (Ctrl+Z)"
            aria-keyshortcuts="Control+Z"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-zinc-700 shadow-sm ring-1 ring-black/5 transition hover:bg-zinc-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:active:scale-100 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:disabled:hover:bg-zinc-900"
          >
            {/* Mirrored in RTL so the arrow points back along the reading
                direction. */}
            <svg
              className="h-4 w-4 rtl:-scale-x-100"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M7.793 2.232a.75.75 0 0 1-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 0 1 0 10.75H10.75a.75.75 0 0 1 0-1.5h2.875a3.875 3.875 0 0 0 0-7.75H3.622l4.146 3.957a.75.75 0 0 1-1.036 1.085l-5.5-5.25a.75.75 0 0 1 0-1.085l5.5-5.25a.75.75 0 0 1 1.06.025Z"
                clipRule="evenodd"
              />
            </svg>
            <span>בטל פעולה</span>
          </button>
        </div>

        <AiSmartSeatingModal
          isOpen={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
          unseatedGuests={allUnseatedGuests}
          tables={tables}
          allGuests={guests}
          onApplyAssignments={handleBulkSeatGuests}
        />

        {/* Tables are added, removed and resized by admins on the admin
            event page; this screen only seats guests at them. */}
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
          <CreateZoneForm
            availableTables={ungroupedTables}
            onCreateZone={handleCreateZone}
          />
          <FloorPlanUploader
            floorPlanUrl={floorPlanUrl}
            isSaving={isSavingFloorPlan}
            error={floorPlanError}
            onUpload={onUploadFloorPlan}
            onRemove={onRemoveFloorPlan}
          />
        </div>
      </div>

      <SeatingPickProvider value={seatingPick}>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveGuest(null)}
      >
        <div className="grid grid-cols-1 gap-2 lg:min-h-[75vh] lg:grid-cols-[16rem_1fr]">
          <div className="max-h-[45vh] min-h-0 overflow-y-auto lg:max-h-none">
            <UnseatedGuestsPanel
              guests={unseatedGuests}
              isFiltered={searchQuery.trim().length > 0}
            />
          </div>

          <div
            className={`relative min-h-[50vh] overflow-y-auto rounded-xl p-2 transition sm:p-3 lg:min-h-0 ${
              floorPlanUrl
                ? ""
                : "border-2 border-dashed border-zinc-300 dark:border-zinc-700"
            }`}
          >
            {floorPlanUrl && (
              <>
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${floorPlanUrl})` }}
                />
                <div className="absolute inset-0 bg-white/85 dark:bg-zinc-950/85" />
              </>
            )}

            <div className="relative flex flex-col gap-4">
              {zones.length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    אזורי הושבה
                  </h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {zones.map((zone) => (
                      <SeatingZoneCard
                        key={zone.id}
                        zone={zone}
                        memberTables={tables.filter((table) =>
                          zone.tableIds.includes(table.id),
                        )}
                        guests={guests.filter(
                          (guest) =>
                            guest.seatingAssignment?.kind === "zone" &&
                            guest.seatingAssignment.id === zone.id,
                        )}
                        onRemoveGuest={handleRemoveGuest}
                        onDeleteZone={handleDeleteZone}
                        searchQuery={searchQuery}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div>
                {zones.length > 0 && (
                  <h3 className="mb-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    שולחנות בודדים
                  </h3>
                )}
                {swapSourceTable && (
                  <div className="sticky top-0 z-10 mb-2 flex items-center justify-between gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-md">
                    <span>
                      בחר שולחן להחלפה עם {formatTableLabel(swapSourceTable)}
                      <span className="ms-2 hidden text-xs font-normal text-indigo-200 md:inline">
                        (Esc לביטול)
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setTableToSwap(null)}
                      className="min-h-9 shrink-0 rounded-md bg-white/15 px-3 py-1 text-xs font-semibold md:min-h-0 md:px-2.5 transition hover:bg-white/25"
                    >
                      ביטול
                    </button>
                  </div>
                )}
                {tables.length === 0 && (
                  <p className="rounded-xl bg-white/80 px-4 py-6 text-center text-sm text-zinc-500 dark:bg-zinc-900/80 dark:text-zinc-400">
                    עדיין לא הוגדרו שולחנות לאירוע. צוות ההפקה יגדיר את
                    השולחנות, ואז תוכלו לשבץ אליהם את האורחים.
                  </p>
                )}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {ungroupedTables.map((table) => (
                    <SeatingTableCard
                      key={table.id}
                      table={table}
                      guests={guests.filter(
                        (guest) =>
                          guest.seatingAssignment?.kind === "table" &&
                          guest.seatingAssignment.id === table.id,
                      )}
                      onRemoveGuest={handleRemoveGuest}
                      onEmptyTable={handleEmptyTable}
                      searchQuery={searchQuery}
                      swapMode={
                        !swapSourceTable
                          ? "idle"
                          : swapSourceTable.id === table.id
                            ? "source"
                            : "target"
                      }
                      justSwapped={swapToast?.tableIds.includes(table.id)}
                      onSwapClick={handleSwapClick}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <DragOverlay>
          {activeGuest ? <GuestChip guest={activeGuest} /> : null}
        </DragOverlay>
      </DndContext>
      </SeatingPickProvider>

      {pickedGuest && (
        <div
          role="status"
          className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-2xl"
        >
          <span className="min-w-0">
            <span className="block truncate">נבחר: {pickedGuest.name}</span>
            <span className="block text-xs font-normal text-indigo-100">
              הקישו &quot;העבר לכאן&quot; בשולחן הרצוי
            </span>
          </span>
          <button
            type="button"
            onClick={() => setPickedGuestId(null)}
            className="min-h-11 shrink-0 rounded-xl bg-white/15 px-4 font-semibold transition hover:bg-white/25"
          >
            ביטול
          </button>
        </div>
      )}

      <SeatingCopilotChat
        eventId={eventId}
        guests={guests}
        tables={tables}
        onBulkSeatGuests={handleBulkSeatGuests}
      />

      {swapToast && (
        <div
          key={swapToast.id}
          role="status"
          className="fixed inset-x-3 bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-50 mx-auto flex w-fit max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-2xl ring-1 ring-white/10 transition duration-300 starting:translate-y-3 starting:opacity-0 dark:bg-zinc-800"
        >
          <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-xs">
            ✓
          </span>
          {swapToast.message}
        </div>
      )}
    </div>
  );
}
