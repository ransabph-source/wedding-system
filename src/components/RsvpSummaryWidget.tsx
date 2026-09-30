import { getArrivedCount, getConfirmedCount } from "@/lib/guestRsvp";
import type { Guest } from "@/types/guest";

interface RsvpSummaryWidgetProps {
  guests: Guest[];
  className?: string;
}

// Counts how many people are confirmed to attend. Partial confirmations only
// count the confirmed part of the party; a guest checked in on the event day
// counts in full even if their RSVP was never recorded.
function getAttendingCount(guest: Guest): number {
  if (guest.rsvpStatus === "confirmed") return getConfirmedCount(guest);
  return getArrivedCount(guest);
}

export default function RsvpSummaryWidget({
  guests,
  className = "",
}: RsvpSummaryWidgetProps) {
  const totalGuests = guests.reduce((sum, guest) => sum + guest.partySize, 0);
  const confirmedGuests = guests.reduce(
    (sum, guest) => sum + getAttendingCount(guest),
    0,
  );
  const percent =
    totalGuests > 0
      ? Math.min(100, Math.round((confirmedGuests / totalGuests) * 100))
      : 0;

  return (
    <div
      className={`flex flex-col justify-end ${className}`}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="truncate text-xs font-medium text-zinc-500 dark:text-zinc-400">
          אישרו הגעה מתוך סך המוזמנים
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <p
            dir="ltr"
            className="text-sm font-bold tabular-nums text-zinc-900 dark:text-zinc-50"
          >
            <span className="text-emerald-600 dark:text-emerald-400">
              {confirmedGuests}
            </span>
            <span className="text-zinc-400 dark:text-zinc-500">
              /{totalGuests}
            </span>
          </p>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-emerald-700 ring-1 ring-inset ring-emerald-600/15 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20">
            {percent}%
          </span>
        </div>
      </div>

      <div
        role="progressbar"
        aria-label="אישרו הגעה מתוך סך המוזמנים"
        aria-valuemin={0}
        aria-valuemax={totalGuests}
        aria-valuenow={confirmedGuests}
        aria-valuetext={`${confirmedGuests} מתוך ${totalGuests}`}
        className="h-2 w-full overflow-hidden rounded-full bg-zinc-200/80 dark:bg-zinc-800"
      >
        <div
          className="h-full rounded-full bg-emerald-500 transition-[width] duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
