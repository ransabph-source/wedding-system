"use client";

import { useState, type FormEvent } from "react";
import type { Guest, RsvpStatus } from "@/types/guest";

interface LogCallModalProps {
  guest: Guest;
  onClose: () => void;
  onSubmit: (update: { status: RsvpStatus; partySize: number }) => void;
}

type CallOutcome = "confirmed" | "declined" | "left_message";

const OUTCOME_OPTIONS: { value: CallOutcome; label: string; description: string }[] = [
  {
    value: "confirmed",
    label: "אישרו הגעה",
    description: "האורח מגיע לאירוע",
  },
  {
    value: "declined",
    label: "לא מגיעים",
    description: "האורח לא יגיע לאירוע",
  },
  {
    value: "left_message",
    label: "השארתי הודעה",
    description: "לא ענו - נשארים בטיפול טלפוני",
  },
];

export default function LogCallModal({
  guest,
  onClose,
  onSubmit,
}: LogCallModalProps) {
  const [outcome, setOutcome] = useState<CallOutcome>("confirmed");
  const [partySize, setPartySize] = useState(String(guest.partySize));
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsedPartySize = Math.floor(Number(partySize));
    if (!Number.isFinite(parsedPartySize) || parsedPartySize <= 0) {
      setError("יש להזין כמות אורחים תקינה");
      return;
    }

    const status: RsvpStatus =
      outcome === "left_message" ? "needs_call" : outcome;

    onSubmit({ status, partySize: parsedPartySize });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="log-call-title"
    >
      <div
        className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl pb-[env(safe-area-inset-bottom)] sm:max-h-[90vh] sm:rounded-3xl sm:pb-0 bg-white shadow-2xl ring-1 ring-black/5 dark:bg-zinc-900">
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 p-4 sm:p-6 dark:border-zinc-800">
          <div className="min-w-0">
            <h2
              id="log-call-title"
              className="text-lg font-bold text-zinc-900 dark:text-zinc-50"
            >
              רישום שיחה
            </h2>
            <p className="mt-1 truncate text-sm text-zinc-500 dark:text-zinc-400">
              {guest.name} · {guest.phone}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגירה"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-6">
          {guest.contactCount > 0 && (
            <p className="rounded-lg bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              נוצר קשר טלפוני עם האורח {guest.contactCount} פעמים בעבר
            </p>
          )}

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              תוצאת השיחה
            </span>
            <div className="flex flex-col gap-2">
              {OUTCOME_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                    outcome === option.value
                      ? "border-indigo-500 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-500/10"
                      : "border-zinc-200 hover:border-indigo-300 dark:border-zinc-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="callOutcome"
                    value={option.value}
                    checked={outcome === option.value}
                    onChange={() => setOutcome(option.value)}
                    className="mt-1 h-4 w-4 text-indigo-600 focus:ring-2 focus:ring-indigo-500/30"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                      {option.label}
                    </span>
                    <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                      {option.description}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="callPartySize"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              כמות מגיעים
            </label>
            <input
              id="callPartySize"
              type="number"
              min={1}
              value={partySize}
              onChange={(e) => {
                setPartySize(e.target.value);
                setError(null);
              }}
              className="rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            />
          </div>

          {error && (
            <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white transition hover:bg-indigo-700 active:bg-indigo-800"
            >
              שמירה
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg bg-zinc-100 px-4 py-2.5 font-semibold text-zinc-700 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
