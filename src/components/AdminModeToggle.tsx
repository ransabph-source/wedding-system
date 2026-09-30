"use client";

import { useAdminMode } from "@/lib/eventEngine";

export default function AdminModeToggle() {
  const { isAdminMode, setIsAdminMode, canToggleAdminMode } = useAdminMode();
  if (!canToggleAdminMode) return null;

  return (
    <label className="flex cursor-pointer select-none items-center gap-2">
      <span className="hidden text-sm font-medium text-zinc-600 sm:inline dark:text-zinc-300">
        תצוגת מנהל
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={isAdminMode}
        aria-label="תצוגת מנהל"
        onClick={() => setIsAdminMode(!isAdminMode)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF9F6] ${
          isAdminMode ? "bg-violet-600" : "bg-zinc-300 dark:bg-zinc-600"
        }`}
      >
        {/* Physical left/right (not start/end) so "on" sits on the left in
            RTL, like a native switch in a Hebrew UI. */}
        <span
          aria-hidden="true"
          className={`absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-md ring-1 ring-black/5 transition-transform duration-200 ease-out ${
            isAdminMode ? "translate-x-0" : "translate-x-5"
          }`}
        />
      </button>
    </label>
  );
}
