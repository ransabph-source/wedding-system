"use client";

import { useState, type KeyboardEvent } from "react";
import { useGifts } from "@/lib/useGifts";
import type { Gift } from "@/types/gift";

interface GiftTrackerViewProps {
  eventId: string;
  coupleNames?: string;
}

type GiftColumn = "guestName" | "attendees" | "amount";
const COLUMNS: GiftColumn[] = ["guestName", "attendees", "amount"];

const MAX_NUMBER_DIGITS = 7;

const shekel = new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "ILS",
  maximumFractionDigits: 0,
});

function isBlank(gift: Gift): boolean {
  return (
    gift.guestName.trim() === "" && gift.attendees === null && gift.amount === null
  );
}

// Digits only; an empty cell is null rather than 0.
function parseWholeNumber(value: string): number | null {
  const digits = value.replace(/\D/g, "").slice(0, MAX_NUMBER_DIGITS);
  return digits === "" ? null : Number(digits);
}

function cellId(rowId: string, column: GiftColumn) {
  return `gift-${rowId}-${column}`;
}

const SHEKEL_FORMAT = '#,##0 "₪"';

async function exportToExcel(gifts: Gift[], coupleNames?: string) {
  // Loaded on demand so ExcelJS stays out of the page bundle.
  const { default: ExcelJS } = await import("exceljs");
  const rows = gifts.filter((gift) => !isBlank(gift));
  const totalAttendees = rows.reduce((sum, g) => sum + (g.attendees ?? 0), 0);
  const totalAmount = rows.reduce((sum, g) => sum + (g.amount ?? 0), 0);

  const workbook = new ExcelJS.Workbook();
  // Right-to-left sheet, header row frozen while scrolling.
  const sheet = workbook.addWorksheet("מתנות", {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }],
  });
  sheet.columns = [
    { header: "שם האורח", key: "guestName", width: 32 },
    { header: "כמות מגיעים", key: "attendees", width: 14 },
    {
      header: "סכום המתנה (₪)",
      key: "amount",
      width: 18,
      style: { numFmt: SHEKEL_FORMAT },
    },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF059669" },
  };
  headerRow.alignment = { horizontal: "center", vertical: "middle" };
  headerRow.height = 22;

  sheet.addRows(
    rows.map((gift) => ({
      guestName: gift.guestName.trim(),
      attendees: gift.attendees,
      amount: gift.amount,
    })),
  );

  const totalRow = sheet.addRow({
    guestName: 'סה"כ',
    attendees: totalAttendees,
    amount: totalAmount,
  });
  totalRow.font = { bold: true };
  totalRow.eachCell((cell) => {
    cell.border = { top: { style: "medium" } };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${coupleNames ? `מתנות - ${coupleNames}` : "מתנות"}.xlsx`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function GiftTrackerView({
  eventId,
  coupleNames,
}: GiftTrackerViewProps) {
  const { gifts, loadStatus, saveStatus, updateGift, removeGift, retrySave } =
    useGifts(eventId);
  // The always-present blank row at the bottom. Typing in it turns it into a
  // real gift (same ID, so focus stays put) and a fresh blank row appears.
  const [draftId, setDraftId] = useState(() => crypto.randomUUID());

  const draftRow: Gift = {
    id: draftId,
    guestName: "",
    attendees: null,
    amount: null,
  };
  const rows = [...gifts, draftRow];
  const filledGifts = gifts.filter((gift) => !isBlank(gift));
  const totalAttendees = filledGifts.reduce(
    (sum, gift) => sum + (gift.attendees ?? 0),
    0,
  );
  const totalAmount = filledGifts.reduce(
    (sum, gift) => sum + (gift.amount ?? 0),
    0,
  );

  function handleChange(
    rowId: string,
    changes: Partial<Omit<Gift, "id">>,
  ) {
    if (rowId === draftId) {
      const hasContent = Object.values(changes).some(
        (value) => value !== null && value !== "",
      );
      if (!hasContent) return;
      setDraftId(crypto.randomUUID());
    }
    updateGift(rowId, changes);
  }

  // Enter and the up/down arrows move between rows like a spreadsheet.
  function handleKeyDown(
    e: KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    column: GiftColumn,
  ) {
    let targetIndex: number | null = null;
    if (e.key === "Enter" || e.key === "ArrowDown") targetIndex = rowIndex + 1;
    if (e.key === "ArrowUp") targetIndex = rowIndex - 1;
    if (targetIndex === null) return;
    e.preventDefault();
    const target = rows[Math.max(0, Math.min(rows.length - 1, targetIndex))];
    document.getElementById(cellId(target.id, column))?.focus();
  }

  const cellInputClasses =
    "h-11 w-full bg-transparent px-3 text-base text-zinc-900 outline-none placeholder:text-zinc-300 focus:bg-indigo-50 focus:ring-2 focus:ring-inset focus:ring-indigo-500 dark:text-zinc-50 dark:placeholder:text-zinc-600 dark:focus:bg-indigo-500/10";

  if (loadStatus !== "ready") {
    return (
      <p className="rounded-xl bg-white px-6 py-10 text-center text-sm text-zinc-500 shadow-md ring-1 ring-black/5 dark:bg-zinc-900 dark:text-zinc-400">
        {loadStatus === "loading"
          ? "טוען את רשימת המתנות..."
          : "טעינת רשימת המתנות נכשלה. רעננו את הדף ונסו שוב."}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 rounded-xl bg-white p-3 shadow-md ring-1 ring-black/5 sm:flex-row sm:items-center sm:justify-between sm:p-4 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
            ניהול מתנות
          </h2>
          <span className="text-sm text-zinc-600 dark:text-zinc-300">
            {filledGifts.length} רשומות
          </span>
          <span className="text-sm text-zinc-600 dark:text-zinc-300">
            {totalAttendees} משתתפים
          </span>
          <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            סה&quot;כ {shekel.format(totalAmount)}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span
            role="status"
            className={`text-xs ${
              saveStatus === "error"
                ? "text-rose-600 dark:text-rose-400"
                : "text-zinc-400 dark:text-zinc-500"
            }`}
          >
            {saveStatus === "saving" ? (
              "שומר..."
            ) : saveStatus === "error" ? (
              <>
                השמירה נכשלה ·{" "}
                <button
                  type="button"
                  onClick={retrySave}
                  className="font-semibold underline underline-offset-2"
                >
                  נסו שוב
                </button>
              </>
            ) : (
              "כל השינויים נשמרו"
            )}
          </span>
          <button
            type="button"
            onClick={() => void exportToExcel(gifts, coupleNames)}
            disabled={filledGifts.length === 0}
            className="flex min-h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
              <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
              <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
            </svg>
            ייצוא לאקסל
          </button>
        </div>
      </div>

      <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800 ring-1 ring-inset ring-amber-600/15 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20">
        מומלץ להוריד ולשמור את הרשימה כקובץ אקסל למחשב האישי. אין הנהלת האתר
        נושאת באחריות לשמירת נתוני המתנות לטווח ארוך.
      </p>

      <div className="overflow-x-auto rounded-xl bg-white shadow-md ring-1 ring-black/5 dark:bg-zinc-900">
        <table className="w-full min-w-[30rem] border-collapse text-right">
          <thead className="bg-zinc-50 text-xs font-semibold text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-400">
            <tr>
              <th scope="col" className="w-10 px-2 py-2 text-center">
                #
              </th>
              <th scope="col" className="px-3 py-2">
                שם האורח
              </th>
              <th scope="col" className="w-36 px-3 py-2">
                מספר משתתפים
              </th>
              <th scope="col" className="w-40 px-3 py-2">
                סכום המתנה (₪)
              </th>
              <th scope="col" className="w-12 px-2 py-2">
                <span className="sr-only">פעולות</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((gift, rowIndex) => {
              const isDraft = gift.id === draftId;
              return (
                <tr
                  key={gift.id}
                  className="border-t border-zinc-100 dark:border-zinc-800"
                >
                  <td className="px-2 text-center text-xs tabular-nums text-zinc-400 dark:text-zinc-500">
                    {isDraft ? "" : rowIndex + 1}
                  </td>
                  {COLUMNS.map((column) => (
                    <td
                      key={column}
                      className="border-s border-zinc-100 p-0 dark:border-zinc-800"
                    >
                      <input
                        id={cellId(gift.id, column)}
                        type="text"
                        inputMode={column === "guestName" ? "text" : "numeric"}
                        dir={column === "guestName" ? undefined : "ltr"}
                        autoComplete="off"
                        aria-label={
                          column === "guestName"
                            ? `שם האורח, שורה ${rowIndex + 1}`
                            : column === "attendees"
                              ? `מספר משתתפים, שורה ${rowIndex + 1}`
                              : `סכום המתנה, שורה ${rowIndex + 1}`
                        }
                        placeholder={
                          isDraft
                            ? column === "guestName"
                              ? "הקלידו שם להוספת שורה..."
                              : ""
                            : ""
                        }
                        value={
                          column === "guestName"
                            ? gift.guestName
                            : String(gift[column] ?? "")
                        }
                        onChange={(e) =>
                          handleChange(
                            gift.id,
                            column === "guestName"
                              ? { guestName: e.target.value }
                              : { [column]: parseWholeNumber(e.target.value) },
                          )
                        }
                        onKeyDown={(e) => handleKeyDown(e, rowIndex, column)}
                        className={`${cellInputClasses} ${
                          column === "guestName" ? "" : "text-right tabular-nums"
                        }`}
                      />
                    </td>
                  ))}
                  <td className="border-s border-zinc-100 px-1 text-center dark:border-zinc-800">
                    {!isDraft && (
                      <button
                        type="button"
                        onClick={() => removeGift(gift.id)}
                        aria-label={`מחיקת שורה ${rowIndex + 1}${gift.guestName ? ` (${gift.guestName})` : ""}`}
                        className="grid h-9 w-9 place-items-center rounded-full text-zinc-400 transition hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                          <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                        </svg>
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t-2 border-zinc-200 bg-zinc-50 text-sm font-bold text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100">
            <tr>
              <td />
              <td className="px-3 py-2.5">סה&quot;כ</td>
              <td className="px-3 py-2.5 tabular-nums">{totalAttendees}</td>
              <td className="px-3 py-2.5 tabular-nums">
                {shekel.format(totalAmount)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
