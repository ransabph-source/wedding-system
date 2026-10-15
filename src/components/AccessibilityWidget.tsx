"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";

// Floating accessibility menu shown on every page. Each option toggles a class
// on <html> that globals.css styles; the choices are remembered in
// localStorage so they stay on across pages and visits.

const OPTIONS = [
  { key: "text", className: "a11y-text", label: "הגדלת טקסט" },
  { key: "contrast", className: "a11y-contrast", label: "ניגודיות גבוהה" },
  { key: "links", className: "a11y-links", label: "הדגשת קישורים" },
] as const;

type OptionKey = (typeof OPTIONS)[number]["key"];

const STORAGE_KEY = "a11y-prefs";

// The enabled option keys as a space-separated string, so the snapshot is a
// stable primitive. Kept in memory too, in case storage is blocked.
let current: string | null = null;
const listeners = new Set<() => void>();

function getSnapshot(): string {
  if (current === null) {
    try {
      current = localStorage.getItem(STORAGE_KEY) ?? "";
    } catch {
      current = "";
    }
  }
  return current;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setEnabled(keys: OptionKey[]) {
  current = keys.join(" ");
  try {
    localStorage.setItem(STORAGE_KEY, current);
  } catch {
    // Storage blocked; the choice lasts until the page reloads.
  }
  for (const listener of listeners) listener();
}

export default function AccessibilityWidget() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => "");
  const enabled = snapshot.split(" ").filter(Boolean) as OptionKey[];
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    const html = document.documentElement;
    for (const option of OPTIONS) {
      html.classList.toggle(option.className, snapshot.split(" ").includes(option.key));
    }
  }, [snapshot]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function toggle(key: OptionKey) {
    setEnabled(
      enabled.includes(key) ? enabled.filter((k) => k !== key) : [...enabled, key],
    );
  }

  return (
    <div
      ref={rootRef}
      dir="rtl"
      className="fixed end-0 top-1/2 z-[60] flex -translate-y-1/2 items-center gap-2 print:hidden"
    >
      {open && (
        <div
          id={menuId}
          role="group"
          aria-label="תפריט נגישות"
          className="w-60 rounded-2xl bg-white p-4 text-zinc-900 shadow-2xl ring-1 ring-black/10 dark:bg-zinc-900 dark:text-zinc-50 dark:ring-white/10"
        >
          <p className="mb-3 text-base font-bold">נגישות</p>
          <ul className="space-y-2">
            {OPTIONS.map((option) => {
              const on = enabled.includes(option.key);
              return (
                <li key={option.key}>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    onClick={() => toggle(option.key)}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-start text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                      on
                        ? "bg-blue-700 text-white"
                        : "bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-700"
                    }`}
                  >
                    {option.label}
                    <span
                      aria-hidden
                      className={`relative h-5 w-9 shrink-0 rounded-full transition ${
                        on ? "bg-white/40" : "bg-zinc-300 dark:bg-zinc-600"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                          on ? "start-4.5" : "start-0.5"
                        }`}
                      />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-zinc-200 pt-3 text-sm dark:border-zinc-700">
            <button
              type="button"
              onClick={() => setEnabled([])}
              disabled={enabled.length === 0}
              className="font-medium text-zinc-600 hover:text-zinc-900 disabled:opacity-40 dark:text-zinc-300 dark:hover:text-white"
            >
              איפוס
            </button>
            <Link
              href="/accessibility"
              onClick={() => setOpen(false)}
              className="font-medium text-blue-700 underline-offset-4 hover:underline dark:text-blue-400"
            >
              הצהרת נגישות
            </Link>
          </div>
        </div>
      )}
      <button
        ref={buttonRef}
        type="button"
        aria-label="תפריט נגישות"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((o) => !o)}
        className="grid h-12 w-12 place-items-center rounded-s-2xl bg-blue-700 text-2xl text-white shadow-lg transition hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        <span aria-hidden>♿</span>
      </button>
    </div>
  );
}
