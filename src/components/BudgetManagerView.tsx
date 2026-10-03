"use client";

import { useState, type KeyboardEvent } from "react";
import type { BudgetItem } from "@/types/budget";

interface BudgetManagerViewProps {
  items: BudgetItem[];
  readOnly?: boolean;
  onAddItem: (item: BudgetItem) => void;
  onUpdateItem: (
    itemId: string,
    updates: Partial<
      Pick<
        BudgetItem,
        "category" | "supplierName" | "estimatedCost" | "actualCost" | "paidSoFar"
      >
    >,
  ) => void;
  onDeleteItem: (itemId: string) => void;
  confirmedGuestsCount: number;
  averageGiftAmount: number;
  onAverageGiftAmountChange: (value: number) => void;
}

type EditableField =
  | "category"
  | "supplierName"
  | "estimatedCost"
  | "actualCost"
  | "paidSoFar";

const NUMBER_FIELDS: EditableField[] = [
  "estimatedCost",
  "actualCost",
  "paidSoFar",
];

interface EditingCell {
  itemId: string;
  field: EditableField;
}

const editInputClasses =
  "w-full rounded-md border border-indigo-400 bg-white px-2 py-1 text-inherit outline-none ring-2 ring-indigo-500/30 dark:bg-zinc-800 dark:text-zinc-50";

const currencyFormatter = new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "ILS",
  maximumFractionDigits: 0,
});

function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

export default function BudgetManagerView({
  items,
  readOnly = false,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  confirmedGuestsCount,
  averageGiftAmount,
  onAverageGiftAmountChange,
}: BudgetManagerViewProps) {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [draftValue, setDraftValue] = useState("");

  const totalBudget = items.reduce((sum, item) => sum + item.estimatedCost, 0);
  const totalActualCost = items.reduce((sum, item) => sum + item.actualCost, 0);
  const totalPaid = items.reduce((sum, item) => sum + item.paidSoFar, 0);
  const remainingBalance = totalActualCost - totalPaid;

  const estimatedTotalRevenue = averageGiftAmount * confirmedGuestsCount;
  const cashFlowStatus = estimatedTotalRevenue - totalBudget;
  const isCashFlowPositive = cashFlowStatus >= 0;

  const costPerGuest =
    confirmedGuestsCount > 0 ? totalActualCost / confirmedGuestsCount : 0;

  function handleGiftAmountChange(value: string) {
    const parsed = Number(value);
    onAverageGiftAmountChange(
      Number.isFinite(parsed) && parsed >= 0 ? parsed : 0,
    );
  }

  function handleDeleteClick(item: BudgetItem) {
    const label = item.category || item.supplierName || "השורה";
    if (window.confirm(`למחוק את "${label}" מטבלת התקציב?`)) {
      onDeleteItem(item.id);
    }
  }

  function handleAddRow() {
    onAddItem({
      id: crypto.randomUUID(),
      category: "",
      supplierName: "",
      estimatedCost: 0,
      actualCost: 0,
      paidSoFar: 0,
    });
  }

  function startEditing(item: BudgetItem, field: EditableField) {
    setEditingCell({ itemId: item.id, field });
    setDraftValue(String(item[field]));
  }

  function cancelEditing() {
    setEditingCell(null);
    setDraftValue("");
  }

  function commitEditing(item: BudgetItem) {
    if (!editingCell) return;
    const { field } = editingCell;

    if (NUMBER_FIELDS.includes(field)) {
      const parsed = Number(draftValue);
      if (Number.isFinite(parsed) && parsed >= 0) {
        onUpdateItem(item.id, { [field]: parsed });
      }
    } else {
      onUpdateItem(item.id, { [field]: draftValue.trim() });
    }

    cancelEditing();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>, item: BudgetItem) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitEditing(item);
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEditing();
    }
  }

  function renderEditableCell(
    item: BudgetItem,
    field: EditableField,
    placeholder: string,
  ) {
    const isEditing =
      editingCell?.itemId === item.id && editingCell.field === field;
    const isNumberField = NUMBER_FIELDS.includes(field);
    const rawValue = item[field];

    if (readOnly) {
      return (
        <span className="block w-full px-1.5 py-1 text-right">
          {isNumberField
            ? formatCurrency(Number(rawValue))
            : String(rawValue) || placeholder}
        </span>
      );
    }

    if (isEditing) {
      return (
        <input
          type={isNumberField ? "number" : "text"}
          min={isNumberField ? 0 : undefined}
          value={draftValue}
          autoFocus
          onChange={(e) => setDraftValue(e.target.value)}
          onBlur={() => commitEditing(item)}
          onKeyDown={(e) => handleKeyDown(e, item)}
          className={editInputClasses}
        />
      );
    }

    const isEmpty = rawValue === "" || (isNumberField && rawValue === 0);

    return (
      <button
        type="button"
        onClick={() => startEditing(item, field)}
        className={`w-full rounded-md px-1.5 py-1 text-right transition hover:bg-indigo-50 dark:hover:bg-indigo-500/10 ${
          isEmpty ? "text-zinc-400 dark:text-zinc-500" : ""
        }`}
      >
        {isNumberField
          ? formatCurrency(Number(rawValue))
          : String(rawValue) || placeholder}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-black/5 dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-right">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50">
                <th className="px-3 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  קטגוריה
                </th>
                <th className="px-3 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  שם ספק
                </th>
                <th className="px-3 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  עלות משוערת
                </th>
                <th className="px-3 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  עלות בפועל
                </th>
                <th className="px-3 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  שולם עד כה
                </th>
                <th className="px-3 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  <span className="sr-only">פעולות</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-zinc-400 dark:text-zinc-500"
                  >
                    עדיין לא נוספו הוצאות
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/40"
                  >
                    <td className="px-2.5 py-1 text-sm font-medium text-zinc-800 dark:text-zinc-100">
                      {renderEditableCell(item, "category", "קטגוריה חדשה")}
                    </td>
                    <td className="px-2.5 py-1 text-sm text-zinc-800 dark:text-zinc-100">
                      {renderEditableCell(item, "supplierName", "הוספת ספק")}
                    </td>
                    <td className="px-2.5 py-1 text-sm text-zinc-800 dark:text-zinc-100">
                      {renderEditableCell(item, "estimatedCost", "")}
                    </td>
                    <td className="px-2.5 py-1 text-sm text-zinc-800 dark:text-zinc-100">
                      {renderEditableCell(item, "actualCost", "")}
                    </td>
                    <td className="px-2.5 py-1 text-sm text-zinc-800 dark:text-zinc-100">
                      {renderEditableCell(item, "paidSoFar", "")}
                    </td>
                    <td className="px-2.5 py-1 text-center">
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(item)}
                          aria-label={`מחיקת ${item.category || item.supplierName || "שורה"}`}
                          className="grid h-9 w-9 place-items-center rounded-full text-rose-500 md:h-7 md:w-7 transition hover:bg-rose-100 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-500/10"
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
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!readOnly && (
        <div className="border-t border-zinc-100 p-2.5 dark:border-zinc-800">
          <button
            type="button"
            onClick={handleAddRow}
            className="min-h-11 w-full rounded-lg border-2 border-dashed border-zinc-300 px-4 py-1.5 sm:min-h-0 text-sm font-semibold text-zinc-500 transition hover:border-indigo-400 hover:text-indigo-600 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-indigo-500 dark:hover:text-indigo-400"
          >
            + הוספת הוצאה
          </button>
        </div>
        )}
      </div>

      <div className="sticky bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-10 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl bg-white/95 p-3 shadow-lg ring-1 ring-black/5 backdrop-blur dark:bg-zinc-900/95 dark:ring-white/10">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              סה&quot;כ הוצאות בפועל
            </p>
            <p className="text-base font-bold text-zinc-900 dark:text-zinc-50">
              {formatCurrency(totalActualCost)}
            </p>
          </div>
          <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-700" />
          <div>
            <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
              עלות לאורח
            </p>
            <p className="text-base font-bold text-indigo-700 dark:text-indigo-300">
              {formatCurrency(costPerGuest)}
            </p>
          </div>
        </div>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          מבוסס על {confirmedGuestsCount} מוזמנים שאישרו הגעה
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-md ring-1 ring-black/5 dark:bg-zinc-900">
        <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          תחזית הכנסות ותזרים מזומנים
        </h3>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1 rounded-xl bg-indigo-50 p-3 ring-1 ring-indigo-100 dark:bg-indigo-500/10 dark:ring-indigo-500/20">
            <label
              htmlFor="averageGiftAmount"
              className="text-xs font-semibold text-indigo-700 dark:text-indigo-300"
            >
              גובה מתנה ממוצעת משוערת
            </label>
            <input
              id="averageGiftAmount"
              type="number"
              min={0}
              value={averageGiftAmount || ""}
              onChange={(e) => handleGiftAmountChange(e.target.value)}
              placeholder="0"
              disabled={readOnly}
              className="rounded-lg border border-indigo-300 bg-white px-2.5 py-1.5 text-base font-bold text-indigo-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-60 dark:border-indigo-500/40 dark:bg-zinc-900 dark:text-indigo-100"
            />
          </div>

          <div className="flex flex-col gap-1 rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/50">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              כמות אורחים שאישרו הגעה
            </p>
            <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              {confirmedGuestsCount}
            </p>
          </div>

          <div className="flex flex-col gap-1 rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/50">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              סה&quot;כ הכנסות משוערות
            </p>
            <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              {formatCurrency(estimatedTotalRevenue)}
            </p>
          </div>

          <div
            className={`flex flex-col gap-1 rounded-xl p-3 ${
              isCashFlowPositive
                ? "bg-emerald-50 dark:bg-emerald-500/10"
                : "bg-rose-50 dark:bg-rose-500/10"
            }`}
          >
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              סטטוס תזרים
            </p>
            <p
              className={`text-lg font-bold ${
                isCashFlowPositive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {formatCurrency(cashFlowStatus)}
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              {isCashFlowPositive ? "רווח משוער" : "גירעון משוער"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1 rounded-xl bg-white p-3 shadow-md ring-1 ring-black/5 dark:bg-zinc-900">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            סה&quot;כ תקציב
          </p>
          <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            {formatCurrency(totalBudget)}
          </p>
        </div>
        <div className="flex flex-col gap-1 rounded-xl bg-white p-3 shadow-md ring-1 ring-black/5 dark:bg-zinc-900">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            סה&quot;כ עלות בפועל
          </p>
          <p
            className={`text-lg font-bold ${
              totalActualCost > totalBudget
                ? "text-rose-600 dark:text-rose-400"
                : "text-zinc-900 dark:text-zinc-50"
            }`}
          >
            {formatCurrency(totalActualCost)}
          </p>
        </div>
        <div className="flex flex-col gap-1 rounded-xl bg-white p-3 shadow-md ring-1 ring-black/5 dark:bg-zinc-900">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            יתרה לתשלום
          </p>
          <p
            className={`text-lg font-bold ${
              remainingBalance > 0
                ? "text-amber-600 dark:text-amber-400"
                : "text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {formatCurrency(remainingBalance)}
          </p>
        </div>
        <div className="flex flex-col gap-1 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 p-3 text-white shadow-md ring-1 ring-black/5">
          <p className="text-xs font-medium text-indigo-100">עלות לאורח</p>
          <p className="text-lg font-bold">{formatCurrency(costPerGuest)}</p>
          <p className="text-[11px] text-indigo-200">
            {confirmedGuestsCount > 0
              ? `לפי ${confirmedGuestsCount} מוזמנים שאישרו הגעה`
              : "אין עדיין מוזמנים שאישרו הגעה"}
          </p>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-zinc-400 dark:text-zinc-600">
        לתשומת לבכם: מודל התקציב וההכנסות המשוערות נועד לשמש ככלי עזר והערכה
        כללית בלבד. הנתונים המוצגים מבוססים על הערכות המשתמש ואינם מהווים
        הבטחה או התחייבות לרווח או להכנסה בפועל. השימוש בכלי זה נעשה על אחריות
        המשתמש בלבד, ובעצם השימוש בו מוותר המשתמש על כל טענה, דרישה או תביעה
        כלפי מפתחי ומפעילי המערכת בגין פערים או נזקים כלכליים כלשהם.
      </p>
    </div>
  );
}
