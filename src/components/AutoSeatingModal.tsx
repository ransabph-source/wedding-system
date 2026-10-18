"use client";

import { useState } from "react";
import {
  generateMockSeatingPlan,
  type AiSeatingResult,
} from "@/lib/aiSeatingMock";
import type { Guest } from "@/types/guest";
import type { SeatingTable } from "@/types/seating";

interface AutoSeatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  unseatedGuests: Guest[];
  tables: SeatingTable[];
  allGuests: Guest[];
  onApplyAssignments: (
    assignments: { guestId: string; tableId: string }[],
  ) => void;
}

export default function AutoSeatingModal({
  isOpen,
  onClose,
  unseatedGuests,
  tables,
  allGuests,
  onApplyAssignments,
}: AutoSeatingModalProps) {
  const [instructions, setInstructions] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<AiSeatingResult | null>(null);

  if (!isOpen) return null;

  function handleClose() {
    setIsGenerating(false);
    setResult(null);
    setInstructions("");
    onClose();
  }

  function handleGenerate() {
    setIsGenerating(true);
    setResult(null);

    setTimeout(() => {
      const plan = generateMockSeatingPlan(
        unseatedGuests,
        tables,
        allGuests,
        instructions,
      );
      onApplyAssignments(plan.assignments);
      setResult(plan);
      setIsGenerating(false);
    }, 1500);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auto-seating-title"
    >
      <div
        className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-3xl pb-[env(safe-area-inset-bottom)] sm:max-h-[90vh] sm:rounded-3xl sm:pb-0 bg-white shadow-2xl ring-1 ring-black/5 dark:bg-zinc-900">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-indigo-600" />

        <div className="flex flex-col gap-5 p-5 sm:p-8">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.25 2A2.25 2.25 0 0 0 2 4.25v2.5A2.25 2.25 0 0 0 4.25 9h2.5A2.25 2.25 0 0 0 9 6.75v-2.5A2.25 2.25 0 0 0 6.75 2h-2.5Zm0 9A2.25 2.25 0 0 0 2 13.25v2.5A2.25 2.25 0 0 0 4.25 18h2.5A2.25 2.25 0 0 0 9 15.75v-2.5A2.25 2.25 0 0 0 6.75 11h-2.5Zm9-9A2.25 2.25 0 0 0 11 4.25v2.5A2.25 2.25 0 0 0 13.25 9h2.5A2.25 2.25 0 0 0 18 6.75v-2.5A2.25 2.25 0 0 0 15.75 2h-2.5Zm0 9A2.25 2.25 0 0 0 11 13.25v2.5A2.25 2.25 0 0 0 13.25 18h2.5A2.25 2.25 0 0 0 18 15.75v-2.5A2.25 2.25 0 0 0 15.75 11h-2.5Z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <h2
                id="auto-seating-title"
                className="text-lg font-bold text-zinc-900 dark:text-zinc-50"
              >
                שיבוץ אוטומטי
              </h2>
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="סגירה"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            >
              ✕
            </button>
          </div>

          {result ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-6 text-center dark:bg-emerald-500/10">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-emerald-500 text-2xl text-white">
                  ✓
                </div>
                <p className="text-base font-semibold text-emerald-800 dark:text-emerald-300">
                  {result.assignments.length > 0
                    ? `שובצו ${result.assignments.length} אורחים ל-${result.tablesUsed} שולחנות בהצלחה!`
                    : "לא נמצאו אורחים לשיבוץ."}
                </p>
                {result.unassignedGuestIds.length > 0 && (
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    {result.unassignedGuestIds.length} אורחים לא שובצו עקב
                    מחסור במקום פנוי.
                  </p>
                )}
                {result.overbookAllowance > 0 && (
                  <p className="text-sm text-indigo-700 dark:text-indigo-400">
                    בהתאם להנחיות, הותרה חריגה של עד {result.overbookAllowance}{" "}
                    מקומות מעבר לקיבולת הרגילה בכל שולחן.
                  </p>
                )}
                {result.mixedTableGuestCount > 0 && (
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    {result.mixedTableGuestCount} אורחים שובצו לשולחן משותף
                    עם קבוצה אחרת, בשל חוסר מקום בשולחנות של הקבוצה שלהם.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
              >
                סגירה
              </button>
            </div>
          ) : isGenerating ? (
            <div className="flex flex-col items-center gap-4 py-10">
              <div className="h-14 w-14 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600 dark:border-indigo-500/20 dark:border-t-indigo-400" />
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                משבצים את האורחים לשולחנות...
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                שיבוץ מהיר של האורחים שעוד אין להם שולחן, לפי הקבוצות שלהם
                והמקומות הפנויים בשולחנות.
              </p>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="ai-seating-instructions"
                  className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  הוראות מותאמות אישית (אופציונלי)
                </label>
                <textarea
                  id="ai-seating-instructions"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={4}
                  placeholder="לדוגמה: משפחת החתן בצד ימין, שולחנות 1-5 לחברים..."
                  className="resize-none rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500"
                />
              </div>

              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                {unseatedGuests.length > 0
                  ? `${unseatedGuests.length} אורחים ללא שולחן ימוינו לפי קבוצה ויושבו אוטומטית.`
                  : "אין כרגע אורחים ללא שולחן."}
              </p>

              <button
                type="button"
                onClick={handleGenerate}
                disabled={unseatedGuests.length === 0}
                className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 active:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                שיבוץ אוטומטי
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
