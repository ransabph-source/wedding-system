"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Guest } from "@/types/guest";
import { getGroupColorClasses } from "@/lib/groupColors";

interface GuestChipProps {
  guest: Guest;
  onRemove?: (guestId: string) => void;
  highlighted?: boolean;
}

export default function GuestChip({
  guest,
  onRemove,
  highlighted = false,
}: GuestChipProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: guest.id });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-sm shadow-sm select-none [-webkit-touch-callout:none] ${
        highlighted
          ? "border-yellow-400 bg-yellow-100 dark:border-yellow-400/60 dark:bg-yellow-500/10"
          : "border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800"
      } ${
        isDragging
          ? "opacity-40"
          : "cursor-grab touch-manipulation active:cursor-grabbing"
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate font-medium text-zinc-800 dark:text-zinc-100">
          {guest.name}
          {guest.partySize > 1 && (
            <span className="ms-1 font-normal text-zinc-500 dark:text-zinc-400">
              ({guest.partySize})
            </span>
          )}
        </span>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${getGroupColorClasses(guest.group)}`}
        >
          {guest.group}
        </span>
      </div>

      {onRemove && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onRemove(guest.id)}
          aria-label={`הסרת ${guest.name} מהשולחן`}
          className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-zinc-400 transition hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
        >
          ✕
        </button>
      )}
    </div>
  );
}
