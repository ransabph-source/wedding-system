"use client";

import { useState } from "react";
import {
  generateMockSeatingPlan,
  type AiSeatingResult,
} from "@/lib/aiSeatingMock";
import type { Guest } from "@/types/guest";
import type { SeatingTable } from "@/types/seating";

interface AiSmartSeatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  unseatedGuests: Guest[];
  tables: SeatingTable[];
  allGuests: Guest[];
  onApplyAssignments: (
    assignments: { guestId: string; tableId: string }[],
  ) => void;
}

export default function AiSmartSeatingModal({
  isOpen,
  onClose,
  unseatedGuests,
  tables,
  allGuests,
  onApplyAssignments,
}: AiSmartSeatingModalProps) {
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-seating-title"
    >
      <div
        className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5 dark:bg-zinc-900">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-l from-fuchsia-500 via-violet-500 to-indigo-500" />

        <div className="flex flex-col gap-5 p-6 sm:p-8">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-fuchsia-500 via-violet-500 to-indigo-500 text-xl shadow-lg shadow-violet-500/30">
                ✨
              </div>
              <h2
                id="ai-seating-title"
                className="text-lg font-bold text-zinc-900 dark:text-zinc-50"
              >
                שיבוץ חכם (AI)
              </h2>
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="סגירה"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
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
                  <p className="text-sm text-violet-700 dark:text-violet-400">
                    בהתאם להנחיות, הותרה חריגה של עד {result.overbookAllowance}{" "}
                    מקומות מעבר לקיבולת הרגילה בכל שולחן.
                  </p>
                )}
                {result.mixedTableGuestCount > 0 && (
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    {result.mixedTableGuestCount} אורחים שובצו לשולחן משותף
                    עם קטגוריה אחרת, בשל חוסר מקום בשולחנות של הקטגוריה שלהם.
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
              <div className="relative h-14 w-14">
                <div className="absolute inset-0 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600 dark:border-violet-500/20 dark:border-t-violet-400" />
                <div className="absolute inset-0 grid place-items-center text-lg">
                  ✨
                </div>
              </div>
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                הבינה המלאכותית מסדרת את השולחנות...
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                תנו לבינה המלאכותית לסדר לכם את השולחנות בשניות.
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
                  className="resize-none rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500"
                />
              </div>

              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                {unseatedGuests.length > 0
                  ? `${unseatedGuests.length} אורחים ללא שולחן ימוינו לפי קטגוריה ויושבו אוטומטית.`
                  : "אין כרגע אורחים ללא שולחן."}
              </p>

              <button
                type="button"
                onClick={handleGenerate}
                disabled={unseatedGuests.length === 0}
                className="group relative overflow-hidden rounded-xl bg-gradient-to-l from-fuchsia-600 via-violet-600 to-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/30 transition hover:shadow-violet-500/50 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
              >
                <span className="relative">✨ Generate Seating (Mock)</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
