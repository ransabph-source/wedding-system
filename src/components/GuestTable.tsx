"use client";

import { useState, type KeyboardEvent } from "react";
import type { Guest } from "@/types/guest";
import { getCategoryColorClasses } from "@/lib/categoryColors";
import {
  getConfirmedCount,
  getRsvpFractionClasses,
  hasPhoneNumber,
} from "@/lib/guestRsvp";

interface GuestTableProps {
  guests: Guest[];
  categories: string[];
  isFiltered?: boolean;
  readOnly?: boolean;
  onUpdateGuest: (
    guestId: string,
    updates: Partial<Pick<Guest, "name" | "phone" | "partySize" | "category">>,
  ) => void;
  onDeleteGuest: (guestId: string) => void;
  // Omitted when RSVPs are locked for the current phase.
  onConfirmGuest?: (guestId: string) => void;
  onBulkConfirmGuests?: (guestIds: string[]) => void;
  onBulkDeleteGuests?: (guestIds: string[]) => void;
}

type EditableField = "name" | "phone" | "partySize";

interface EditingCell {
  guestId: string;
  field: EditableField;
}

const editInputClasses =
  "w-full rounded-md border border-indigo-400 bg-white px-2 py-1 text-inherit outline-none ring-2 ring-indigo-500/30 dark:bg-zinc-800 dark:text-zinc-50";

const checkboxClasses =
  "h-4 w-4 cursor-pointer rounded border-zinc-300 accent-indigo-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-600";

export default function GuestTable({
  guests,
  categories,
  isFiltered = false,
  readOnly = false,
  onUpdateGuest,
  onDeleteGuest,
  onConfirmGuest,
  onBulkConfirmGuests,
  onBulkDeleteGuests,
}: GuestTableProps) {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [draftValue, setDraftValue] = useState("");
  const [selectedGuestIds, setSelectedGuestIds] = useState<Set<string>>(
    () => new Set(),
  );

  const canBulkConfirm = Boolean(onBulkConfirmGuests);
  const canBulkDelete = !readOnly && Boolean(onBulkDeleteGuests);
  const isSelectable = canBulkConfirm || canBulkDelete;
  const columnCount = isSelectable ? 6 : 5;

  // Bulk actions only ever touch guests currently on screen, so a selection
  // hidden by the search filter (or already deleted) is never acted on.
  const selectedGuests = guests.filter((guest) =>
    selectedGuestIds.has(guest.id),
  );
  const allVisibleSelected =
    guests.length > 0 && selectedGuests.length === guests.length;
  const someVisibleSelected =
    selectedGuests.length > 0 && !allVisibleSelected;

  function toggleGuestSelected(guestId: string) {
    setSelectedGuestIds((prev) => {
      const next = new Set(prev);
      if (next.has(guestId)) next.delete(guestId);
      else next.add(guestId);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedGuestIds(
      allVisibleSelected ? new Set() : new Set(guests.map((guest) => guest.id)),
    );
  }

  function clearSelection() {
    setSelectedGuestIds(new Set());
  }

  function handleBulkConfirmClick() {
    if (!onBulkConfirmGuests) return;
    onBulkConfirmGuests(selectedGuests.map((guest) => guest.id));
    clearSelection();
  }

  function handleBulkDeleteClick() {
    if (!onBulkDeleteGuests) return;
    const count = selectedGuests.length;
    const message =
      count === 1
        ? `למחוק את ${selectedGuests[0].name} מרשימת המוזמנים?`
        : `למחוק ${count} אורחים מרשימת המוזמנים? לא ניתן לבטל פעולה זו.`;
    if (window.confirm(message)) {
      onBulkDeleteGuests(selectedGuests.map((guest) => guest.id));
      clearSelection();
    }
  }

  function handleDeleteClick(guest: Guest) {
    if (window.confirm(`למחוק את ${guest.name} מרשימת המוזמנים?`)) {
      onDeleteGuest(guest.id);
    }
  }

  function startEditing(guest: Guest, field: EditableField) {
    setEditingCell({ guestId: guest.id, field });
    setDraftValue(String(guest[field]));
  }

  function cancelEditing() {
    setEditingCell(null);
    setDraftValue("");
  }

  function commitEditing(guest: Guest) {
    if (!editingCell) return;

    if (editingCell.field === "partySize") {
      const parsed = Math.floor(Number(draftValue));
      if (Number.isFinite(parsed) && parsed > 0) {
        onUpdateGuest(guest.id, { partySize: parsed });
      }
    } else if (editingCell.field === "name") {
      const trimmed = draftValue.trim();
      if (trimmed) onUpdateGuest(guest.id, { name: trimmed });
    } else {
      // Phone is optional: clearing it marks the guest as missing a phone.
      onUpdateGuest(guest.id, { phone: draftValue.trim() });
    }

    cancelEditing();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>, guest: Guest) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitEditing(guest);
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEditing();
    }
  }

  function renderCellValue(guest: Guest, field: EditableField) {
    if (field === "phone" && !hasPhoneNumber(guest)) {
      return (
        <span
          dir="rtl"
          title="לא ניתן לשלוח לאורח זה אישור הגעה דיגיטלי"
          className="inline-flex rounded-full bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-700 ring-1 ring-inset ring-orange-600/20 dark:bg-orange-500/10 dark:text-orange-400 dark:ring-orange-400/20"
        >
          חסר נייד
        </span>
      );
    }
    return String(guest[field]);
  }

  function renderEditableCell(guest: Guest, field: EditableField, dir?: "ltr") {
    const isEditing =
      editingCell?.guestId === guest.id && editingCell.field === field;

    if (readOnly) {
      return (
        <span dir={dir} className="block w-full px-1.5 py-1 text-right">
          {renderCellValue(guest, field)}
        </span>
      );
    }

    if (isEditing) {
      return (
        <input
          type={field === "partySize" ? "number" : "text"}
          min={field === "partySize" ? 1 : undefined}
          dir={dir}
          value={draftValue}
          autoFocus
          onChange={(e) => setDraftValue(e.target.value)}
          onBlur={() => commitEditing(guest)}
          onKeyDown={(e) => handleKeyDown(e, guest)}
          className={editInputClasses}
        />
      );
    }

    return (
      <button
        type="button"
        onClick={() => startEditing(guest, field)}
        dir={dir}
        className="w-full rounded-md px-1.5 py-1 text-right transition hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
      >
        {renderCellValue(guest, field)}
      </button>
    );
  }

  function renderRsvpFractionCell(guest: Guest) {
    const isEditing =
      editingCell?.guestId === guest.id && editingCell.field === "partySize";
    if (isEditing) return renderEditableCell(guest, "partySize");

    const confirmed = getConfirmedCount(guest);
    const pill = (
      <span
        dir="ltr"
        className={`inline-flex min-w-11 justify-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ring-1 ring-inset ${getRsvpFractionClasses(guest)}`}
      >
        {confirmed}/{guest.partySize}
      </span>
    );
    const label = `אישרו ${confirmed} מתוך ${guest.partySize}`;

    if (readOnly) {
      return (
        <span className="block px-1.5 py-1" title={label}>
          {pill}
        </span>
      );
    }

    return (
      <button
        type="button"
        onClick={() => startEditing(guest, "partySize")}
        title={`${label} · לחצו לעריכת מספר המוזמנים`}
        className="rounded-md px-1.5 py-1 transition hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
      >
        {pill}
      </button>
    );
  }

  return (
    <div className="h-full overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-black/5 dark:bg-zinc-900">
      <div className="h-full overflow-auto">
        <table className="w-full text-right">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/90">
              {isSelectable && (
                <th className="w-10 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someVisibleSelected;
                    }}
                    onChange={toggleSelectAll}
                    disabled={guests.length === 0}
                    aria-label={allVisibleSelected ? "בטל בחירה" : "בחר הכל"}
                    title={allVisibleSelected ? "בטל בחירה" : "בחר הכל"}
                    className={checkboxClasses}
                  />
                </th>
              )}
              <th className="px-3 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                שם אורח
              </th>
              <th className="px-3 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                טלפון
              </th>
              <th className="px-3 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                קטגוריה
              </th>
              <th className="px-3 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                אישרו / הוזמנו
              </th>
              <th className="px-3 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                <span className="sr-only">פעולות</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {guests.length === 0 ? (
              <tr>
                <td
                  colSpan={columnCount}
                  className="px-6 py-8 text-center text-zinc-400 dark:text-zinc-500"
                >
                  {isFiltered
                    ? "לא נמצאו אורחים התואמים לחיפוש"
                    : "עדיין לא נוספו אורחים"}
                </td>
              </tr>
            ) : (
              guests.map((guest) => (
                <tr
                  key={guest.id}
                  className={`border-b border-zinc-100 last:border-0 dark:border-zinc-800 ${
                    selectedGuestIds.has(guest.id)
                      ? "bg-indigo-50/70 hover:bg-indigo-50 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/15"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                  }`}
                >
                  {isSelectable && (
                    <td className="px-3 py-1">
                      <input
                        type="checkbox"
                        checked={selectedGuestIds.has(guest.id)}
                        onChange={() => toggleGuestSelected(guest.id)}
                        aria-label={`בחירת ${guest.name}`}
                        className={checkboxClasses}
                      />
                    </td>
                  )}
                  <td className="px-2.5 py-1 text-sm text-zinc-800 dark:text-zinc-100">
                    {renderEditableCell(guest, "name")}
                  </td>
                  <td
                    className="px-2.5 py-1 text-sm text-zinc-800 dark:text-zinc-100"
                    dir="ltr"
                  >
                    {renderEditableCell(guest, "phone", "ltr")}
                  </td>
                  <td className="px-2.5 py-1">
                    {readOnly ? (
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getCategoryColorClasses(guest.category)}`}
                      >
                        {guest.category}
                      </span>
                    ) : (
                      <select
                        value={guest.category}
                        onChange={(e) =>
                          onUpdateGuest(guest.id, { category: e.target.value })
                        }
                        className={`rounded-full border-0 px-2 py-0.5 text-xs font-medium outline-none ring-1 ring-inset ring-black/5 transition focus:ring-2 focus:ring-indigo-500/50 ${getCategoryColorClasses(guest.category)}`}
                      >
                        {!categories.includes(guest.category) && (
                          <option value={guest.category}>
                            {guest.category}
                          </option>
                        )}
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="px-2.5 py-1 text-sm text-zinc-800 dark:text-zinc-100">
                    {renderRsvpFractionCell(guest)}
                  </td>
                  <td className="px-2.5 py-1">
                    <div className="flex items-center justify-end gap-1.5">
                      {onConfirmGuest && guest.rsvpStatus !== "confirmed" && (
                        <button
                          type="button"
                          onClick={() => onConfirmGuest(guest.id)}
                          title={`סימון ${guest.name} כמאשר/ת הגעה ללא אישור דיגיטלי`}
                          className="whitespace-nowrap rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 transition hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20 dark:hover:bg-emerald-500/20"
                        >
                          אישור ידני
                        </button>
                      )}
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(guest)}
                          aria-label={`מחיקת ${guest.name}`}
                          className="grid h-7 w-7 place-items-center rounded-full text-rose-500 transition hover:bg-rose-100 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-500/10"
                        >
                          <svg
                            className="h-4 w-4"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              fillRule="evenodd"
                              d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isSelectable && selectedGuests.length > 0 && (
        <div
          role="region"
          aria-label="פעולות על אורחים נבחרים"
          className="fixed inset-x-3 bottom-4 z-40 mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3 rounded-2xl bg-zinc-900 px-4 py-3 text-white shadow-2xl ring-1 ring-white/10 dark:bg-zinc-800"
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold">
              {selectedGuests.length} אורחים נבחרו
            </span>
            <button
              type="button"
              onClick={clearSelection}
              className="text-xs font-medium text-zinc-400 underline-offset-2 transition hover:text-white hover:underline"
            >
              בטל בחירה
            </button>
          </div>
          <div className="flex items-center gap-2">
            {canBulkConfirm && (
              <button
                type="button"
                onClick={handleBulkConfirmClick}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-500 active:bg-emerald-700"
              >
                אישור הגעה גורף
              </button>
            )}
            {canBulkDelete && (
              <button
                type="button"
                onClick={handleBulkDeleteClick}
                className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-rose-500 active:bg-rose-700"
              >
                מחיקה מרובה
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
