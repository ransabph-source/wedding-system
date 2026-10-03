"use client";

import { useEffect, useState } from "react";

interface SelfCheckInQrModalProps {
  eventId: string;
  onClose: () => void;
}

export default function SelfCheckInQrModal({
  eventId,
  onClose,
}: SelfCheckInQrModalProps) {
  // Rendered only after a click, so window is always available here.
  const [checkInUrl] = useState(
    () => `${window.location.origin}/self-checkin/${eventId}`,
  );
  const [copied, setCopied] = useState(false);
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(checkInUrl)}`;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(checkInUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked (e.g. non-secure origin); the link is still
      // visible and selectable below.
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="self-checkin-qr-title"
    >
      <div
        className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative max-h-[92dvh] w-full max-w-sm overflow-y-auto overscroll-contain rounded-t-3xl pb-[env(safe-area-inset-bottom)] sm:max-h-[90vh] sm:rounded-3xl sm:pb-0 bg-white shadow-2xl ring-1 ring-black/5 transition duration-200 starting:scale-95 starting:opacity-0 dark:bg-zinc-900">
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 p-4 sm:p-5 dark:border-zinc-800">
          <div className="min-w-0">
            <h2
              id="self-checkin-qr-title"
              className="text-lg font-bold text-zinc-900 dark:text-zinc-50"
            >
              QR לצ&apos;ק-אין עצמאי
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              הציבו את הקוד בכניסה לאולם. האורחים יסרקו, יזינו את מספר הטלפון
              ויקבלו את מספר השולחן.
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

        <div className="flex flex-col items-center gap-4 p-6">
          <div className="w-full max-w-[274px] rounded-2xl bg-white p-3 shadow-sm ring-1 ring-zinc-200">
            {/* Third-party generated image; next/image optimisation adds
                nothing here and would need a remotePatterns entry. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrImageUrl}
              alt="קוד QR לצ'ק-אין עצמאי"
              width={250}
              height={250}
              className="aspect-square h-auto w-full"
            />
          </div>

          <div className="flex w-full items-center gap-2 rounded-xl bg-zinc-100 p-1.5 ps-3 dark:bg-zinc-800">
            <span
              dir="ltr"
              className="min-w-0 flex-1 truncate text-left text-xs text-zinc-600 select-all dark:text-zinc-300"
            >
              {checkInUrl}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm ring-1 ring-black/5 transition hover:bg-zinc-50 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600"
            >
              {copied ? "הועתק ✓" : "העתקת קישור"}
            </button>
          </div>

          <div className="flex w-full gap-2">
            <a
              href={qrImageUrl.replace("size=250x250", "size=1000x1000")}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white transition hover:bg-indigo-700 active:bg-indigo-800"
            >
              פתיחה להדפסה
            </a>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg bg-zinc-100 px-3 py-2 text-center text-sm font-semibold text-zinc-700 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              סגור
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
