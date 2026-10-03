"use client";

import type { Guest } from "@/types/guest";

interface DuplicateGuestsModalProps {
  groups: Guest[][];
  onClose: () => void;
  onMerge: (group: Guest[]) => void;
  onIgnore: (group: Guest[]) => void;
}

const actionButtonClasses =
  "flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition";

export default function DuplicateGuestsModal({
  groups,
  onClose,
  onMerge,
  onIgnore,
}: DuplicateGuestsModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="duplicate-guests-title"
    >
      <div
        className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl pb-[env(safe-area-inset-bottom)] sm:max-h-[85vh] sm:rounded-3xl sm:pb-0 bg-white shadow-2xl ring-1 ring-black/5 dark:bg-zinc-900">
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 p-4 sm:p-6 dark:border-zinc-800">
          <div className="min-w-0">
            <h2
              id="duplicate-guests-title"
              className="text-lg font-bold text-zinc-900 dark:text-zinc-50"
            >
              טיפול בכפילויות
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              המערכת זיהתה אורחים עם שם ומספר טלפון זהים. האם תרצו למזג אותם
              לאורח אחד או להשאיר אותם כשני אורחים נפרדים?
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

        <ul className="flex flex-col gap-3 overflow-y-auto p-4 sm:p-6">
          {groups.map((group) => (
            <li
              key={group.map((guest) => guest.id).join(",")}
              className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700"
            >
              <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                {group[0].name}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400" dir="ltr">
                {group[0].phone}
              </p>

              <ul className="mt-2 flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-300">
                {group.map((guest, index) => (
                  <li
                    key={guest.id}
                    className="rounded-lg bg-zinc-100 px-2.5 py-1.5 dark:bg-zinc-800"
                  >
                    עותק {index + 1}: {guest.group} · {guest.partySize} אורחים
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => onMerge(group)}
                  className={`${actionButtonClasses} bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800`}
                >
                  מיזוג לאורח אחד
                </button>
                <button
                  type="button"
                  onClick={() => onIgnore(group)}
                  className={`${actionButtonClasses} border border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800`}
                >
                  התעלם (אלו אורחים שונים)
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
