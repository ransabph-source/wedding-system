"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

// Cookie notice pinned to the bottom of public pages (rendered by Footer).
// Accepting is remembered in localStorage so it isn't shown again.

const STORAGE_KEY = "cookie-consent";

// Kept in memory too, so accepting hides the banner even if storage is blocked.
let accepted: boolean | null = null;
const listeners = new Set<() => void>();

function getSnapshot(): boolean {
  if (accepted === null) {
    try {
      accepted = localStorage.getItem(STORAGE_KEY) === "accepted";
    } catch {
      accepted = false;
    }
  }
  return accepted;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function accept() {
  accepted = true;
  try {
    localStorage.setItem(STORAGE_KEY, "accepted");
  } catch {
    // Storage blocked; the banner stays hidden until the page reloads.
  }
  for (const listener of listeners) listener();
}

export default function CookieBanner() {
  // Hidden on the server so returning visitors never see it flash.
  const hasAccepted = useSyncExternalStore(subscribe, getSnapshot, () => true);
  if (hasAccepted) return null;

  return (
    <div
      dir="rtl"
      role="region"
      aria-label="הודעת עוגיות"
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl bg-zinc-900 px-5 py-4 text-sm text-zinc-100 shadow-2xl ring-1 ring-white/10 sm:flex-row sm:items-center sm:justify-between print:hidden dark:bg-zinc-800"
    >
      <p className="leading-relaxed">
        אתר זה עושה שימוש בעוגיות (Cookies) כדי להבטיח את חווית השימוש הטובה ביותר. בהמשך
        הגלישה הנך מסכים ל
        <Link
          href="/privacy"
          className="font-semibold text-white underline underline-offset-4 hover:text-blue-300"
        >
          מדיניות הפרטיות
        </Link>{" "}
        שלנו.
      </p>
      <button
        type="button"
        onClick={accept}
        className="shrink-0 rounded-xl bg-white px-6 py-2.5 font-semibold text-zinc-900 transition hover:bg-zinc-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
      >
        אישור
      </button>
    </div>
  );
}
