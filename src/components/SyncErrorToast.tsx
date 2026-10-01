"use client";

import { useEventEngine } from "@/lib/eventEngine";

export default function SyncErrorToast() {
  const { syncError, dismissSyncError } = useEventEngine();
  if (!syncError) return null;

  return (
    <div
      role="alert"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white shadow-lg"
    >
      <span>{syncError}</span>
      <button
        type="button"
        onClick={dismissSyncError}
        aria-label="סגירה"
        className="shrink-0 rounded-md px-2 py-1 hover:bg-red-700"
      >
        ✕
      </button>
    </div>
  );
}
