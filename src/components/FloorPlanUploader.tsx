"use client";

import { useRef, type ChangeEvent } from "react";

interface FloorPlanUploaderProps {
  floorPlanUrl: string | null;
  onUpload: (dataUrl: string) => void;
  onRemove: () => void;
}

export default function FloorPlanUploader({
  floorPlanUrl,
  onUpload,
  onRemove,
}: FloorPlanUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onUpload(reader.result);
      }
    };
    reader.readAsDataURL(file);

    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col items-start justify-between gap-2 rounded-xl bg-white p-3 shadow-md ring-1 ring-black/5 sm:flex-row sm:items-center dark:bg-zinc-900">
      <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
        רקע תוכנית האולם
      </h3>

      <div className="flex shrink-0 items-center gap-1.5">
        {floorPlanUrl && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            הסרה
          </button>
        )}
        <label
          htmlFor="floor-plan-upload"
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50 active:bg-indigo-100 dark:hover:bg-indigo-500/10"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 16V4m0 0 4 4m-4-4-4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
            />
          </svg>
          העלאת סקיצה
        </label>
        <input
          ref={inputRef}
          id="floor-plan-upload"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
}
