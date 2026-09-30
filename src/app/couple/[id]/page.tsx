"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import BudgetManagerView from "@/components/BudgetManagerView";
import CategoryManager from "@/components/CategoryManager";
import DuplicateGuestsModal from "@/components/DuplicateGuestsModal";
import GuestForm from "@/components/GuestForm";
import GuestTable from "@/components/GuestTable";
import ImportGuestsButton from "@/components/ImportGuestsButton";
import PhaseLockBanner from "@/components/PhaseLockBanner";
import ReadOnlySeatingMap from "@/components/ReadOnlySeatingMap";
import RsvpManagementView from "@/components/RsvpManagementView";
import RsvpSummaryWidget from "@/components/RsvpSummaryWidget";
import SelfCheckInQrModal from "@/components/SelfCheckInQrModal";
import SearchBar from "@/components/SearchBar";
import StatsBar from "@/components/StatsBar";
import { DEFAULT_BUDGET_ITEMS } from "@/lib/budgetCategories";
import { findDuplicateGuests } from "@/lib/duplicateDetector";
import { useEventEngine } from "@/lib/eventEngine";
import {
  PHASE_BADGE_CLASSES,
  PHASE_LABELS,
  PHASE_LOCK_MESSAGES,
  isSectionEditableForCouple,
} from "@/lib/eventPhaseRules";
import { guestMatchesQuery } from "@/lib/guestSearch";
import { getConfirmedCount } from "@/lib/guestRsvp";
import { getEventById } from "@/lib/mockEvents";
import { DEFAULT_TABLES } from "@/lib/seatingTables";
import type { BudgetItem } from "@/types/budget";
import type { Guest, RsvpStatus } from "@/types/guest";
import type { SeatingTable, SeatingZone } from "@/types/seating";

// The seating board uses @dnd-kit, which generates some internal element IDs
// via a module-level counter that isn't guaranteed to match between a server
// render and the client's first render (a well-known SSR hydration pitfall
// for drag-and-drop libraries). Loading it client-only side-steps that
// entirely, regardless of which tab is active by default.
const SeatingView = dynamic(() => import("@/components/SeatingView"), {
  ssr: false,
  loading: () => (
    <div className="grid h-64 place-items-center text-zinc-400 dark:text-zinc-500">
      טוען את מסך ההושבה...
    </div>
  ),
});

const DEFAULT_CATEGORIES = ["משפחה", "חברים", "עבודה"];

type DashboardTab = "guests" | "seating" | "rsvp" | "budget";

// When merging duplicates, the copy furthest along in the RSVP flow wins.
const RSVP_MERGE_PRIORITY: Record<RsvpStatus, number> = {
  pending_whatsapp: 0,
  needs_call: 1,
  declined: 2,
  confirmed: 3,
};

// Identifies a duplicate group by its members, so an ignored group comes
// back if another matching guest is added later.
function duplicateGroupKey(group: Guest[]) {
  return group
    .map((guest) => guest.id)
    .sort()
    .join(",");
}

function mergeGuests(group: Guest[]): Guest {
  const [primary] = group;
  const rsvpSource = group.reduce((best, guest) =>
    RSVP_MERGE_PRIORITY[guest.rsvpStatus] > RSVP_MERGE_PRIORITY[best.rsvpStatus]
      ? guest
      : best,
  );
  return {
    ...primary,
    partySize: Math.max(...group.map((guest) => guest.partySize)),
    rsvpStatus: rsvpSource.rsvpStatus,
    confirmedCount: rsvpSource.confirmedCount,
    seatingAssignment:
      group.find((guest) => guest.seatingAssignment !== null)
        ?.seatingAssignment ?? null,
    arrived: group.some((guest) => guest.arrived),
    contactCount: group.reduce((sum, guest) => sum + guest.contactCount, 0),
  };
}

function tabButtonClasses(active: boolean) {
  return `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
    active
      ? "bg-indigo-600 text-white shadow"
      : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
  }`;
}

export default function CouplePortalPage() {
  const { id } = useParams<{ id: string }>();
  const event = getEventById(id);
  const { userRole, getPhase, getGuests, setGuests: setEngineGuests } =
    useEventEngine();

  const phase = getPhase(id);
  const isAdmin = userRole === "admin";
  const guests = getGuests(id);
  function setGuests(updater: Guest[] | ((prev: Guest[]) => Guest[])) {
    setEngineGuests(id, updater);
  }
  function canEdit(section: "guests" | "seating" | "rsvp" | "budget") {
    return isAdmin || isSectionEditableForCouple(phase, section);
  }

  const [activeTab, setActiveTab] = useState<DashboardTab>("guests");
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [tables, setTables] = useState<SeatingTable[]>(DEFAULT_TABLES);
  const [zones, setZones] = useState<SeatingZone[]>([]);
  const [floorPlanUrl, setFloorPlanUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [budgetItems, setBudgetItems] =
    useState<BudgetItem[]>(DEFAULT_BUDGET_ITEMS);
  const [averageGiftAmount, setAverageGiftAmount] = useState(0);
  const [ignoredDuplicateKeys, setIgnoredDuplicateKeys] = useState<
    Set<string>
  >(() => new Set());
  const [isDuplicatesModalOpen, setIsDuplicatesModalOpen] = useState(false);
  const [isCheckInQrOpen, setIsCheckInQrOpen] = useState(false);

  const duplicateGroups = findDuplicateGuests(guests).filter(
    (group) => !ignoredDuplicateKeys.has(duplicateGroupKey(group)),
  );

  const visibleGuests = guests.filter((guest) =>
    guestMatchesQuery(guest, searchQuery),
  );

  const totalGuestsCount = guests.reduce(
    (sum, guest) => sum + guest.partySize,
    0,
  );
  const seatedGuestsCount = guests
    .filter((guest) => guest.seatingAssignment !== null)
    .reduce((sum, guest) => sum + guest.partySize, 0);
  const unseatedGuestsCount = totalGuestsCount - seatedGuestsCount;
  const confirmedGuestsCount = guests.reduce(
    (sum, guest) => sum + getConfirmedCount(guest),
    0,
  );

  function handleAddCategory(name: string) {
    setCategories((prev) => (prev.includes(name) ? prev : [...prev, name]));
  }

  function handleDeleteCategory(name: string) {
    setCategories((prev) => prev.filter((category) => category !== name));
  }

  function handleImportGuests(imported: Guest[]) {
    setCategories((prev) => {
      const newCategories = imported
        .map((guest) => guest.category)
        .filter((category) => !prev.includes(category));
      const uniqueNewCategories = Array.from(new Set(newCategories));
      return uniqueNewCategories.length > 0
        ? [...prev, ...uniqueNewCategories]
        : prev;
    });
    setGuests((prev) => [...prev, ...imported]);
  }

  function handleUpdateGuest(
    guestId: string,
    updates: Partial<Pick<Guest, "name" | "phone" | "partySize" | "category">>,
  ) {
    setGuests((prev) =>
      prev.map((guest) =>
        guest.id === guestId ? { ...guest, ...updates } : guest,
      ),
    );
  }

  function handleDeleteGuest(guestId: string) {
    setGuests((prev) => prev.filter((guest) => guest.id !== guestId));
  }

  function handleBulkDeleteGuests(guestIds: string[]) {
    const ids = new Set(guestIds);
    setGuests((prev) => prev.filter((guest) => !ids.has(guest.id)));
  }

  function handleBulkConfirmGuests(guestIds: string[]) {
    const ids = new Set(guestIds);
    setGuests((prev) =>
      prev.map((guest) =>
        ids.has(guest.id)
          ? { ...guest, rsvpStatus: "confirmed", confirmedCount: undefined }
          : guest,
      ),
    );
  }

  // Closes the duplicates modal once its last group has been handled.
  function resolvingDuplicateGroup(action: (group: Guest[]) => void) {
    return (group: Guest[]) => {
      action(group);
      if (duplicateGroups.length <= 1) setIsDuplicatesModalOpen(false);
    };
  }

  // Keeps the first copy, folding the others' data into it.
  function handleMergeDuplicates(group: Guest[]) {
    const merged = mergeGuests(group);
    const removedIds = new Set(group.slice(1).map((guest) => guest.id));
    setGuests((prev) =>
      prev
        .filter((guest) => !removedIds.has(guest.id))
        .map((guest) => (guest.id === merged.id ? merged : guest)),
    );
  }

  function handleIgnoreDuplicates(group: Guest[]) {
    setIgnoredDuplicateKeys((prev) =>
      new Set(prev).add(duplicateGroupKey(group)),
    );
  }

  function handleSetRsvpStatus(guestId: string, status: RsvpStatus) {
    setGuests((prev) =>
      prev.map((guest) =>
        guest.id === guestId
          ? { ...guest, rsvpStatus: status, confirmedCount: undefined }
          : guest,
      ),
    );
  }

  function handleLogCall(
    guestId: string,
    update: { status: RsvpStatus; partySize: number },
  ) {
    setGuests((prev) =>
      prev.map((guest) =>
        guest.id === guestId
          ? {
              ...guest,
              rsvpStatus: update.status,
              // The call records how many are coming; the invited party
              // size only grows if they report more than were invited.
              partySize: Math.max(guest.partySize, update.partySize),
              confirmedCount:
                update.status === "confirmed" ? update.partySize : undefined,
              contactCount: guest.contactCount + 1,
            }
          : guest,
      ),
    );
  }

  function handleSeatGuestToTable(guestId: string, tableId: string) {
    setGuests((prev) =>
      prev.map((guest) =>
        guest.id === guestId
          ? { ...guest, seatingAssignment: { kind: "table", id: tableId } }
          : guest,
      ),
    );
  }

  function handleSeatGuestToZone(guestId: string, zoneId: string) {
    setGuests((prev) =>
      prev.map((guest) =>
        guest.id === guestId
          ? { ...guest, seatingAssignment: { kind: "zone", id: zoneId } }
          : guest,
      ),
    );
  }

  function handleBulkSeatGuests(
    assignments: { guestId: string; tableId: string }[],
  ) {
    const assignmentByGuestId = new Map(
      assignments.map((assignment) => [assignment.guestId, assignment.tableId]),
    );
    setGuests((prev) =>
      prev.map((guest) => {
        const tableId = assignmentByGuestId.get(guest.id);
        return tableId
          ? { ...guest, seatingAssignment: { kind: "table", id: tableId } }
          : guest;
      }),
    );
  }

  function handleUnseatGuest(guestId: string) {
    setGuests((prev) =>
      prev.map((guest) =>
        guest.id === guestId ? { ...guest, seatingAssignment: null } : guest,
      ),
    );
  }

  // Moves everyone at table A to table B and vice versa in a single update.
  function handleSwapTables(tableAId: string, tableBId: string) {
    setGuests((prev) =>
      prev.map((guest) => {
        if (guest.seatingAssignment?.kind !== "table") return guest;
        if (guest.seatingAssignment.id === tableAId) {
          return { ...guest, seatingAssignment: { kind: "table", id: tableBId } };
        }
        if (guest.seatingAssignment.id === tableBId) {
          return { ...guest, seatingAssignment: { kind: "table", id: tableAId } };
        }
        return guest;
      }),
    );
  }

  function handleAddTables(newTables: SeatingTable[]) {
    setTables((prev) => [...prev, ...newTables]);
  }

  function handleEditTable(
    tableId: string,
    updates: { name: string; capacity: number },
  ) {
    setTables((prev) =>
      prev.map((table) =>
        table.id === tableId ? { ...table, ...updates } : table,
      ),
    );
  }

  function handleToggleReserved(tableId: string) {
    setTables((prev) =>
      prev.map((table) =>
        table.id === tableId
          ? { ...table, isReserved: !table.isReserved }
          : table,
      ),
    );
  }

  function handleDeleteTable(tableId: string) {
    setTables((prev) => prev.filter((table) => table.id !== tableId));
    setGuests((prev) =>
      prev.map((guest) =>
        guest.seatingAssignment?.kind === "table" &&
        guest.seatingAssignment.id === tableId
          ? { ...guest, seatingAssignment: null }
          : guest,
      ),
    );
  }

  function handleCreateZone(zone: SeatingZone) {
    setZones((prev) => [...prev, zone]);
    setGuests((prev) =>
      prev.map((guest) =>
        guest.seatingAssignment?.kind === "table" &&
        zone.tableIds.includes(guest.seatingAssignment.id)
          ? { ...guest, seatingAssignment: { kind: "zone", id: zone.id } }
          : guest,
      ),
    );
  }

  function handleDeleteZone(zoneId: string) {
    setZones((prev) => prev.filter((zone) => zone.id !== zoneId));
    setGuests((prev) =>
      prev.map((guest) =>
        guest.seatingAssignment?.kind === "zone" &&
        guest.seatingAssignment.id === zoneId
          ? { ...guest, seatingAssignment: null }
          : guest,
      ),
    );
  }

  function handleAddBudgetItem(item: BudgetItem) {
    setBudgetItems((prev) => [...prev, item]);
  }

  function handleUpdateBudgetItem(
    itemId: string,
    updates: Partial<
      Pick<
        BudgetItem,
        "category" | "supplierName" | "estimatedCost" | "actualCost" | "paidSoFar"
      >
    >,
  ) {
    setBudgetItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, ...updates } : item)),
    );
  }

  function handleDeleteBudgetItem(itemId: string) {
    setBudgetItems((prev) => prev.filter((item) => item.id !== itemId));
  }

  return (
    <div className="bg-zinc-100 px-3 py-3 sm:px-4 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-[100rem]">
        <header className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              לוח בקרה
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {event
                ? `ניהול האירוע של ${event.coupleNames}`
                : "ניהול האירוע שלכם במקום אחד"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCheckInQrOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm ring-1 ring-black/5 transition hover:bg-zinc-50 active:scale-[0.98] dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M3.75 2A1.75 1.75 0 0 0 2 3.75v3.5C2 8.216 2.784 9 3.75 9h3.5A1.75 1.75 0 0 0 9 7.25v-3.5A1.75 1.75 0 0 0 7.25 2h-3.5ZM3.5 3.75a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.5a.25.25 0 0 1-.25.25h-3.5a.25.25 0 0 1-.25-.25v-3.5ZM3.75 11A1.75 1.75 0 0 0 2 12.75v3.5c0 .966.784 1.75 1.75 1.75h3.5A1.75 1.75 0 0 0 9 16.25v-3.5A1.75 1.75 0 0 0 7.25 11h-3.5Zm-.25 1.75a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.5a.25.25 0 0 1-.25.25h-3.5a.25.25 0 0 1-.25-.25v-3.5Zm7.5-9A1.75 1.75 0 0 1 12.75 2h3.5c.966 0 1.75.784 1.75 1.75v3.5A1.75 1.75 0 0 1 16.25 9h-3.5A1.75 1.75 0 0 1 11 7.25v-3.5Zm1.75-.25a.25.25 0 0 0-.25.25v3.5c0 .138.112.25.25.25h3.5a.25.25 0 0 0 .25-.25v-3.5a.25.25 0 0 0-.25-.25h-3.5Zm-7.26 1a1 1 0 0 0-1 1v.01a1 1 0 0 0 1 1h.01a1 1 0 0 0 1-1V5.5a1 1 0 0 0-1-1h-.01Zm9 0a1 1 0 0 0-1 1v.01a1 1 0 0 0 1 1h.01a1 1 0 0 0 1-1V5.5a1 1 0 0 0-1-1h-.01Zm-9 9a1 1 0 0 0-1 1v.01a1 1 0 0 0 1 1h.01a1 1 0 0 0 1-1v-.01a1 1 0 0 0-1-1h-.01Zm9 0a1 1 0 0 0-1 1v.01a1 1 0 0 0 1 1h.01a1 1 0 0 0 1-1v-.01a1 1 0 0 0-1-1h-.01Zm-3.5-1.5a1 1 0 0 1 1-1H12a1 1 0 0 1 1 1v.01a1 1 0 0 1-1 1h-.01a1 1 0 0 1-1-1V12Zm6-1a1 1 0 0 0-1 1v.01a1 1 0 0 0 1 1H17a1 1 0 0 0 1-1V12a1 1 0 0 0-1-1h-.01Zm-1 6a1 1 0 0 1 1-1H17a1 1 0 0 1 1 1v.01a1 1 0 0 1-1 1h-.01a1 1 0 0 1-1-1V17Zm-4-1a1 1 0 0 0-1 1v.01a1 1 0 0 0 1 1H12a1 1 0 0 0 1-1V17a1 1 0 0 0-1-1h-.01Z"
                  clipRule="evenodd"
                />
              </svg>
              QR לצ&apos;ק-אין עצמאי
            </button>
            {isAdmin && (
              <span className="rounded-full bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white">
                מצב הנהלה - עקיפת נעילות
              </span>
            )}
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${PHASE_BADGE_CLASSES[phase]}`}
            >
              שלב: {PHASE_LABELS[phase]}
            </span>
          </div>
        </header>

        {isCheckInQrOpen && (
          <SelfCheckInQrModal
            eventId={id}
            onClose={() => setIsCheckInQrOpen(false)}
          />
        )}

        <StatsBar
          totalGuests={totalGuestsCount}
          seatedGuests={seatedGuestsCount}
          unseatedGuests={unseatedGuestsCount}
        />

        <div className="mb-3 flex w-full flex-row flex-nowrap items-end justify-between gap-4">
          <div className="flex shrink-0 flex-col items-start gap-3">
            {activeTab !== "rsvp" && activeTab !== "budget" && (
              <div className="max-w-md">
                <SearchBar value={searchQuery} onChange={setSearchQuery} />
              </div>
            )}

            <nav className="inline-flex w-fit gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-black/5 dark:bg-zinc-900">
              <button
                type="button"
                onClick={() => setActiveTab("guests")}
                className={tabButtonClasses(activeTab === "guests")}
              >
                רשימת מוזמנים
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("seating")}
                className={tabButtonClasses(activeTab === "seating")}
              >
                סידורי הושבה
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("rsvp")}
                className={tabButtonClasses(activeTab === "rsvp")}
              >
                ניהול אישורי הגעה
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("budget")}
                className={tabButtonClasses(activeTab === "budget")}
              >
                ניהול תקציב
              </button>
            </nav>
          </div>

          {activeTab === "guests" && (
            <RsvpSummaryWidget
              guests={guests}
              className="min-w-0 max-w-3xl flex-1"
            />
          )}
        </div>

        <div>
          {activeTab === "guests" ? (
            <div className="flex flex-col gap-2">
              {!canEdit("guests") && (
                <PhaseLockBanner message={PHASE_LOCK_MESSAGES[phase]} />
              )}

              {canEdit("guests") && (
                <div className="grid grid-cols-1 gap-2 lg:grid-cols-[2fr_1fr]">
                  <GuestForm
                    categories={categories}
                    onAddGuest={(guest) =>
                      setGuests((prev) => [...prev, guest])
                    }
                  />
                  <ImportGuestsButton
                    categories={categories}
                    onImportGuests={handleImportGuests}
                  />
                </div>
              )}

              {canEdit("guests") && duplicateGroups.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
                  <span>
                    ⚠️ נמצאו {duplicateGroups.length} חשדות לכפילויות ברשימה
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsDuplicatesModalOpen(true)}
                    className="rounded-lg bg-amber-600 px-3 py-1.5 text-white transition hover:bg-amber-700 active:bg-amber-800"
                  >
                    טיפול בכפילויות
                  </button>
                </div>
              )}

              {isDuplicatesModalOpen && duplicateGroups.length > 0 && (
                <DuplicateGuestsModal
                  groups={duplicateGroups}
                  onClose={() => setIsDuplicatesModalOpen(false)}
                  onMerge={resolvingDuplicateGroup(handleMergeDuplicates)}
                  onIgnore={resolvingDuplicateGroup(handleIgnoreDuplicates)}
                />
              )}

              <div className="min-h-[60vh] overflow-hidden rounded-xl">
                <GuestTable
                  guests={visibleGuests}
                  categories={categories}
                  isFiltered={searchQuery.trim().length > 0}
                  readOnly={!canEdit("guests")}
                  onUpdateGuest={handleUpdateGuest}
                  onDeleteGuest={handleDeleteGuest}
                  onConfirmGuest={
                    canEdit("rsvp")
                      ? (guestId) => handleSetRsvpStatus(guestId, "confirmed")
                      : undefined
                  }
                  onBulkConfirmGuests={
                    canEdit("rsvp") ? handleBulkConfirmGuests : undefined
                  }
                  onBulkDeleteGuests={handleBulkDeleteGuests}
                />
              </div>

              {canEdit("guests") && (
                <CategoryManager
                  categories={categories}
                  onAddCategory={handleAddCategory}
                  onDeleteCategory={handleDeleteCategory}
                />
              )}
            </div>
          ) : activeTab === "seating" ? (
            !canEdit("seating") ? (
              <div>
                <PhaseLockBanner message={PHASE_LOCK_MESSAGES[phase]} />
                <ReadOnlySeatingMap tables={tables} zones={zones} guests={guests} />
              </div>
            ) : (
            <SeatingView
              guests={guests}
              tables={tables}
              zones={zones}
              onAddTables={handleAddTables}
              onEditTable={handleEditTable}
              onDeleteTable={handleDeleteTable}
              onToggleReserved={handleToggleReserved}
              onCreateZone={handleCreateZone}
              onDeleteZone={handleDeleteZone}
              onSeatGuestToTable={handleSeatGuestToTable}
              onSeatGuestToZone={handleSeatGuestToZone}
              onUnseatGuest={handleUnseatGuest}
              onBulkSeatGuests={handleBulkSeatGuests}
              onSwapTables={handleSwapTables}
              floorPlanUrl={floorPlanUrl}
              onUploadFloorPlan={setFloorPlanUrl}
              onRemoveFloorPlan={() => setFloorPlanUrl(null)}
              searchQuery={searchQuery}
            />
            )
          ) : activeTab === "rsvp" ? (
            <div>
              {!canEdit("rsvp") && (
                <PhaseLockBanner message={PHASE_LOCK_MESSAGES[phase]} />
              )}
              <RsvpManagementView
                guests={guests}
                readOnly={!canEdit("rsvp")}
                onSetRsvpStatus={handleSetRsvpStatus}
                onLogCall={handleLogCall}
              />
            </div>
          ) : (
            <div>
              {!canEdit("budget") && (
                <PhaseLockBanner message={PHASE_LOCK_MESSAGES[phase]} />
              )}
              <BudgetManagerView
                items={budgetItems}
                readOnly={!canEdit("budget")}
                onAddItem={handleAddBudgetItem}
                onUpdateItem={handleUpdateBudgetItem}
                onDeleteItem={handleDeleteBudgetItem}
                confirmedGuestsCount={confirmedGuestsCount}
                averageGiftAmount={averageGiftAmount}
                onAverageGiftAmountChange={setAverageGiftAmount}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
