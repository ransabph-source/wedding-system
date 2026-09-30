"use client";

import { useState } from "react";

export interface ImportSheetInfo {
  name: string;
  guestCount: number;
}

interface ExcelImportCategoryModalProps {
  fileName: string;
  sheets: ImportSheetInfo[];
  categories: string[];
  onCancel: () => void;
  onConfirm: (categoryBySheetName: Record<string, string>) => void;
}

const CUSTOM_CATEGORY_VALUE = "__custom__";

const selectClasses =
  "rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50";

export default function ExcelImportCategoryModal({
  fileName,
  sheets,
  categories,
  onCancel,
  onConfirm,
}: ExcelImportCategoryModalProps) {
  const [selections, setSelections] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      sheets.map((sheet) => [
        sheet.name,
        categories[0] ?? CUSTOM_CATEGORY_VALUE,
      ]),
    ),
  );
  const [customValues, setCustomValues] = useState<Record<string, string>>(
    {},
  );

  const isMultiSheet = sheets.length > 1;
  const totalGuests = sheets.reduce((sum, sheet) => sum + sheet.guestCount, 0);

  function resolvedCategory(sheetName: string): string {
    const selection = selections[sheetName];
    if (selection === CUSTOM_CATEGORY_VALUE) {
      return (customValues[sheetName] ?? "").trim();
    }
    return (selection ?? "").trim();
  }

  const isValid = sheets.every(
    (sheet) => resolvedCategory(sheet.name).length > 0,
  );

  function handleConfirm() {
    if (!isValid) return;
    const categoryBySheetName = Object.fromEntries(
      sheets.map((sheet) => [sheet.name, resolvedCategory(sheet.name)]),
    );
    onConfirm(categoryBySheetName);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-category-title"
    >
      <div
        className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5 dark:bg-zinc-900">
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 p-6 dark:border-zinc-800">
          <div className="min-w-0">
            <h2
              id="import-category-title"
              className="text-lg font-bold text-zinc-900 dark:text-zinc-50"
            >
              שיוך קטגוריה לאורחים מהקובץ
            </h2>
            <p className="mt-1 truncate text-sm text-zinc-500 dark:text-zinc-400">
              {fileName} · {totalGuests} אורחים זוהו
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="סגירה"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto p-6">
          <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            {isMultiSheet
              ? "בקובץ נמצאו מספר גיליונות. בחרו קטגוריה שתשויך לכל האורחים בכל גיליון."
              : "בחרו קטגוריה שתשויך לכל האורחים בקובץ."}
          </p>

          {sheets.map((sheet) => (
            <div
              key={sheet.name}
              className="flex flex-col gap-2 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-semibold text-zinc-800 dark:text-zinc-100">
                  {isMultiSheet ? sheet.name : fileName}
                </span>
                <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                  {sheet.guestCount} אורחים
                </span>
              </div>

              <select
                value={selections[sheet.name]}
                onChange={(e) =>
                  setSelections((prev) => ({
                    ...prev,
                    [sheet.name]: e.target.value,
                  }))
                }
                className={selectClasses}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value={CUSTOM_CATEGORY_VALUE}>
                  + קטגוריה חדשה...
                </option>
              </select>

              {selections[sheet.name] === CUSTOM_CATEGORY_VALUE && (
                <input
                  type="text"
                  value={customValues[sheet.name] ?? ""}
                  onChange={(e) =>
                    setCustomValues((prev) => ({
                      ...prev,
                      [sheet.name]: e.target.value,
                    }))
                  }
                  placeholder="שם קטגוריה חדשה"
                  autoFocus
                  className={selectClasses}
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2 border-t border-zinc-100 p-6 dark:border-zinc-800">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isValid}
            className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white transition hover:bg-indigo-700 active:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {totalGuests > 0 ? `ייבוא ${totalGuests} אורחים` : "ייבוא"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg bg-zinc-100 px-4 py-2.5 font-semibold text-zinc-700 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
