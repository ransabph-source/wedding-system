"use client";

import { useEffect, useState } from "react";
import { fetchFloorPlanUrl } from "@/lib/api";

interface LiveFloorPlanModalProps {
  eventId: string;
  onClose: () => void;
}

// Pinch-zoom is turned off on the live screen (see its layout's viewport), so
// the viewer zooms itself and the hostess pans by scrolling.
const ZOOM_LEVELS = [1, 1.5, 2, 3, 4];

type LoadState =
  | { status: "loading" }
  | { status: "ready"; url: string | null }
  | { status: "error" };

export default function LiveFloorPlanModal({
  eventId,
  onClose,
}: LiveFloorPlanModalProps) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [zoomIndex, setZoomIndex] = useState(0);
  const zoom = ZOOM_LEVELS[zoomIndex];

  // Fetched on every open: the signed URL is short-lived, and this also picks
  // up a plan the couple replaced during the event.
  useEffect(() => {
    let cancelled = false;
    fetchFloorPlanUrl(eventId)
      .then((url) => {
        // No plan uploaded is a normal state, shown as such, not an error.
        if (!cancelled) setState({ status: "ready", url: url || null });
      })
      .catch((error: unknown) => {
        console.error(error);
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    // Keep the page behind from scrolling while panning the image.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const imageUrl = state.status === "ready" ? state.url : null;
  const controlClasses =
    "grid h-12 w-12 shrink-0 touch-manipulation place-items-center rounded-2xl bg-white/10 text-2xl sm:h-14 sm:w-14 font-bold text-white transition active:scale-95 disabled:opacity-30";

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-zinc-950"
      role="dialog"
      aria-modal="true"
      aria-labelledby="floor-plan-title"
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
        <h2
          id="floor-plan-title"
          className="min-w-0 truncate text-lg font-bold text-white"
        >
          סקיצת אולם
        </h2>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {imageUrl && (
            <>
              <button
                type="button"
                onClick={() => setZoomIndex((i) => Math.max(0, i - 1))}
                disabled={zoomIndex === 0}
                aria-label="הקטנה"
                className={controlClasses}
              >
                −
              </button>
              <span
                aria-live="polite"
                className="min-w-11 text-center text-sm font-bold tabular-nums text-white sm:min-w-12 sm:text-base"
              >
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() =>
                  setZoomIndex((i) => Math.min(ZOOM_LEVELS.length - 1, i + 1))
                }
                disabled={zoomIndex === ZOOM_LEVELS.length - 1}
                aria-label="הגדלה"
                className={controlClasses}
              >
                +
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="סגירה"
            className="grid h-12 w-12 shrink-0 touch-manipulation place-items-center rounded-2xl bg-white text-zinc-900 sm:h-14 sm:w-14 transition active:scale-95"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-7 w-7" aria-hidden="true">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>
      </div>

      {state.status === "loading" ? (
        <p className="m-auto text-lg text-zinc-300">טוען סקיצה...</p>
      ) : state.status === "error" ? (
        <p className="m-auto px-6 text-center text-lg text-rose-300">
          טעינת הסקיצה נכשלה. בדקו את החיבור ונסו שוב.
        </p>
      ) : !imageUrl ? (
        <p className="m-auto px-6 text-center text-lg text-zinc-300">
          סקיצה לא קיימת
        </p>
      ) : (
        <>
          {/* LTR so scrolling starts at the image's top-left corner. */}
          <div
            dir="ltr"
            className="min-h-0 flex-1 overflow-auto overscroll-contain"
          >
            <div
              className="flex min-h-full items-center justify-center p-2"
              style={{ width: `${zoom * 100}%` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL; no optimisation needed */}
              <img
                src={imageUrl}
                alt="סקיצת האולם"
                onDoubleClick={() =>
                  setZoomIndex((i) => (i === 0 ? 2 : 0))
                }
                className="h-auto w-full max-w-none select-none rounded-lg bg-white"
                draggable={false}
              />
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-white/10 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-sm text-zinc-400">
            <span>הקשה כפולה להגדלה · גלילה להזזה</span>
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-12 items-center rounded-xl px-3 font-semibold text-indigo-300 underline-offset-2 hover:underline"
            >
              פתיחה בלשונית חדשה
            </a>
          </div>
        </>
      )}
    </div>
  );
}
