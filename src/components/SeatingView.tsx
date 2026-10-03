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
import AddTableForm from "@/components/AddTableForm";
import AiSmartSeatingModal from "@/components/AiSmartSeatingModal";
import CreateZoneForm from "@/components/CreateZoneForm";
import FloorPlanUploader from "@/components/FloorPlanUploader";
import GuestChip from "@/components/GuestChip";
import SeatingCopilotChat from "@/components/SeatingCopilotChat";
import SeatingTableCard from "@/components/SeatingTableCard";
import SeatingZoneCard from "@/components/SeatingZoneCard";
import UnseatedGuestsPanel from "@/components/UnseatedGuestsPanel";
import { guestMatchesQuery } from "@/lib/guestSearch";
import { formatTableLabel } from "@/lib/tableDisplay";
import type { Guest } from "@/types/guest";
import type { SeatingTable, SeatingZone } from "@/types/seating";

interface SeatingViewProps {
  guests: Guest[];
  tables: SeatingTable[];
  zones: SeatingZone[];
  onAddTables: (tables: SeatingTable[]) => void;
  onEditTable: (tableId: string, updates: { name: string; capacity: number }) => void;
  onDeleteTable: (tableId: string) => void;
  onToggleReserved: (tableId: string) => void;
  onCreateZone: (zone: SeatingZone) => void;
  onDeleteZone: (zoneId: string) => void;
  onSeatGuestToTable: (guestId: string, tableId: string) => void;
  onSeatGuestToZone: (guestId: string, zoneId: string) => void;
  onUnseatGuest: (guestId: string) => void;
  onBulkSeatGuests: (assignments: { guestId: string; tableId: string }[]) => void;
  onSwapTables: (tableAId: string, tableBId: string) => void;
  floorPlanUrl: string | null;
  onUploadFloorPlan: (dataUrl: string) => void;
  onRemoveFloorPlan: () => void;
  searchQuery: string;
}

export default function SeatingView({
  guests,
  tables,
  zones,
  onAddTables,
  onEditTable,
  onDeleteTable,
  onToggleReserved,
  onCreateZone,
  onDeleteZone,
  onSeatGuestToTable,
  onSeatGuestToZone,
  onUnseatGuest,
  onBulkSeatGuests,
  onSwapTables,
  floorPlanUrl,
  onUploadFloorPlan,
  onRemoveFloorPlan,
  searchQuery,
}: SeatingViewProps) {
  const [activeGuest, setActiveGuest] = useState<Guest | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [tableToSwap, setTableToSwap] = useState<string | null>(null);
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

  // Drops out of swap mode on its own if the picked table is deleted or
  // folded into a zone while waiting for the second pick.
  const swapSourceTable =
    ungroupedTables.find((table) => table.id === tableToSwap) ?? null;

  const isChoosingSwapTarget = swapSourceTable !== null;

  useEffect(() => {
    if (!isChoosingSwapTarget) return;
    function handleKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") setTableToSwap(null);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isChoosingSwapTarget]);

  useEffect(() => {
    if (!swapToast) return;
    const timeout = window.setTimeout(() => setSwapToast(null), 2500);
    return () => window.clearTimeout(timeout);
  }, [swapToast]);

  function handleSwapClick(tableId: string) {
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

    onSwapTables(swapSourceTable.id, targetTable.id);
    setTableToSwap(null);
    // A fresh id re-mounts the toast (restarting its entrance animation and
    // timer) when swaps happen back to back.
    setSwapToast((prev) => ({
      id: (prev?.id ?? 0) + 1,
      message: `האורחים ב${formatTableLabel(swapSourceTable)} וב${formatTableLabel(targetTable)} הוחלפו`,
      tableIds: [swapSourceTable.id, targetTable.id],
    }));
  }

  function handleDragStart(event: DragStartEvent) {
    const guest = guests.find((g) => g.id === event.active.id);
    setActiveGuest(guest ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveGuest(null);

    const overId = event.over?.id;
    if (!overId) return;

    const guestId = String(event.active.id);

    if (overId === "unseated") {
      onUnseatGuest(guestId);
      return;
    }

    const zone = zones.find((z) => z.id === overId);
    if (zone) {
      onSeatGuestToZone(guestId, zone.id);
      return;
    }

    const table = tables.find((t) => t.id === overId);
    if (table) {
      onSeatGuestToTable(guestId, table.id);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setIsAiModalOpen(true)}
          className="group relative isolate flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-l from-fuchsia-600 via-violet-600 to-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-violet-500/40 transition hover:shadow-xl hover:shadow-violet-500/50 active:scale-[0.99]"
        >
          <span
            aria-hidden="true"
            className="absolute inset-0 -z-10 animate-pulse bg-gradient-to-l from-fuchsia-500 via-violet-500 to-indigo-500 opacity-70 blur-xl"
          />
          <span>✨</span>
          <span>שיבוץ חכם (AI)</span>
        </button>

        <AiSmartSeatingModal
          isOpen={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
          unseatedGuests={allUnseatedGuests}
          tables={tables}
          allGuests={guests}
          onApplyAssignments={onBulkSeatGuests}
        />

        <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
          <AddTableForm existingTables={tables} onAddTables={onAddTables} />
          <CreateZoneForm
            availableTables={ungroupedTables}
            onCreateZone={onCreateZone}
          />
          <FloorPlanUploader
            floorPlanUrl={floorPlanUrl}
            onUpload={onUploadFloorPlan}
            onRemove={onRemoveFloorPlan}
          />
        </div>
      </div>

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
                        onRemoveGuest={onUnseatGuest}
                        onDeleteZone={onDeleteZone}
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
                      onRemoveGuest={onUnseatGuest}
                      onEditTable={onEditTable}
                      onDeleteTable={onDeleteTable}
                      onToggleReserved={onToggleReserved}
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

      <SeatingCopilotChat
        guests={guests}
        tables={tables}
        zones={zones}
        onAddTables={onAddTables}
        onDeleteTable={onDeleteTable}
        onBulkSeatGuests={onBulkSeatGuests}
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
