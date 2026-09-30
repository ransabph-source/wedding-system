"use client";

import { useAdminMode } from "@/lib/eventEngine";

export default function AdminModeBanner() {
  const { isAdminMode, canToggleAdminMode } = useAdminMode();
  if (!canToggleAdminMode) return null;

  // Kept mounted and collapsed via grid rows so it slides open and shut
  // instead of popping in when the switch is flipped.
  return (
    <div
      className={`grid shrink-0 transition-[grid-template-rows] duration-300 ease-out ${
        isAdminMode ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
      }`}
      aria-hidden={!isAdminMode}
    >
      <div className="overflow-hidden">
        <div
          role="status"
          className="flex items-center justify-center gap-2 bg-gradient-to-l from-violet-700 to-indigo-700 px-4 py-2 text-sm font-semibold text-white shadow-inner"
        >
          <svg
            className="h-4.5 w-4.5 shrink-0 text-violet-200"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M9.661 2.237a.531.531 0 0 1 .678 0 11.947 11.947 0 0 0 7.078 2.749.5.5 0 0 1 .479.425c.069.52.104 1.05.104 1.59 0 5.162-3.26 9.563-7.834 11.256a.48.48 0 0 1-.332 0C5.26 16.564 2 12.163 2 7c0-.538.035-1.069.104-1.589a.5.5 0 0 1 .48-.425 11.947 11.947 0 0 0 7.077-2.75Zm4.196 5.954a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
              clipRule="evenodd"
            />
          </svg>
          <span>מצב מנהל פעיל - אתה צופה במערכת כפי שהזוג רואה אותה</span>
        </div>
      </div>
    </div>
  );
}
