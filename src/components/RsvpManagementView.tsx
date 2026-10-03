"use client";

import { useState } from "react";
import LogCallModal from "@/components/LogCallModal";
import { getGroupColorClasses } from "@/lib/groupColors";
import type { Guest, RsvpStatus } from "@/types/guest";

interface RsvpManagementViewProps {
  guests: Guest[];
  readOnly?: boolean;
  onSetRsvpStatus: (guestId: string, status: RsvpStatus) => void;
  onLogCall: (
    guestId: string,
    update: { status: RsvpStatus; partySize: number },
  ) => void;
}

interface ColumnConfig {
  status: RsvpStatus;
  title: string;
  headerClasses: string;
  countBadgeClasses: string;
}

const COLUMNS: ColumnConfig[] = [
  {
    status: "pending_whatsapp",
    title: "ממתינים לוואטסאפ",
    headerClasses: "border-t-emerald-400",
    countBadgeClasses:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  },
  {
    status: "needs_call",
    title: "לטיפול טלפוני",
    headerClasses: "border-t-amber-400",
    countBadgeClasses:
      "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  },
  {
    status: "confirmed",
    title: "אישרו הגעה",
    headerClasses: "border-t-indigo-400",
    countBadgeClasses:
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400",
  },
  {
    status: "declined",
    title: "לא מגיעים",
    headerClasses: "border-t-rose-400",
    countBadgeClasses:
      "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
  },
];

const PhoneIcon = (
  <svg
    className="h-3 w-3"
    viewBox="0 0 20 20"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M2 3.5A1.5 1.5 0 0 1 3.5 2h1.148a1.5 1.5 0 0 1 1.465 1.175l.716 3.223a1.5 1.5 0 0 1-.826 1.68l-1.293.648a10.045 10.045 0 0 0 5.55 5.55l.649-1.293a1.5 1.5 0 0 1 1.678-.826l3.224.716A1.5 1.5 0 0 1 18 14.352V15.5a1.5 1.5 0 0 1-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 0 1 3.43 8.326 13.019 13.019 0 0 1 3 5V3.5Z" />
  </svg>
);

function ContactBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
      {PhoneIcon}
      {count}
    </span>
  );
}

export default function RsvpManagementView({
  guests,
  readOnly = false,
  onSetRsvpStatus,
  onLogCall,
}: RsvpManagementViewProps) {
  const [callModalGuestId, setCallModalGuestId] = useState<string | null>(
    null,
  );

  const callModalGuest =
    callModalGuestId !== null
      ? (guests.find((guest) => guest.id === callModalGuestId) ?? null)
      : null;

  function renderActions(guest: Guest) {
    switch (guest.rsvpStatus) {
      case "pending_whatsapp":
        return (
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => onSetRsvpStatus(guest.id, "confirmed")}
              className="min-h-9 rounded-lg bg-emerald-100 px-2.5 py-1.5 text-xs md:min-h-0 font-semibold text-emerald-700 transition hover:bg-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
            >
              אישרו הגעה
            </button>
            <button
              type="button"
              onClick={() => onSetRsvpStatus(guest.id, "declined")}
              className="min-h-9 rounded-lg bg-rose-100 px-2.5 py-1.5 text-xs md:min-h-0 font-semibold text-rose-700 transition hover:bg-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20"
            >
              לא מגיעים
            </button>
            <button
              type="button"
              onClick={() => onSetRsvpStatus(guest.id, "needs_call")}
              className="min-h-9 rounded-lg bg-amber-100 px-2.5 py-1.5 text-xs md:min-h-0 font-semibold text-amber-700 transition hover:bg-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20"
            >
              לטיפול טלפוני
            </button>
          </div>
        );
      case "needs_call":
        return (
          <button
            type="button"
            onClick={() => setCallModalGuestId(guest.id)}
            className="flex min-h-9 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs md:min-h-0 font-semibold text-white transition hover:bg-indigo-700 active:bg-indigo-800"
          >
            {PhoneIcon}
            רישום שיחה
          </button>
        );
      case "confirmed":
      case "declined":
        return (
          <button
            type="button"
            onClick={() => onSetRsvpStatus(guest.id, "pending_whatsapp")}
            className="text-xs font-medium text-zinc-400 underline-offset-2 transition hover:text-indigo-600 hover:underline dark:hover:text-indigo-400"
          >
            שינוי סטטוס
          </button>
        );
      default:
        return null;
    }
  }

  return (
    <div className="grid min-h-[70vh] grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      {COLUMNS.map((column) => {
        const columnGuests = guests.filter(
          (guest) => guest.rsvpStatus === column.status,
        );

        return (
          <div
            key={column.status}
            className={`flex h-full min-h-0 flex-col gap-2 rounded-xl border-t-4 bg-white p-3 shadow-md ring-1 ring-black/5 dark:bg-zinc-900 ${column.headerClasses}`}
          >
            <div className="flex shrink-0 items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                {column.title}
              </h3>
              <span
                className={`inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-2 text-xs font-bold ${column.countBadgeClasses}`}
              >
                {columnGuests.length}
              </span>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pe-1">
              {columnGuests.length === 0 ? (
                <p className="rounded-xl border border-dashed border-zinc-300 px-3 py-6 text-center text-sm text-zinc-400 dark:border-zinc-700 dark:text-zinc-500">
                  אין אורחים ברשימה זו
                </p>
              ) : (
                columnGuests.map((guest) => (
                  <div
                    key={guest.id}
                    className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-800/40"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                          {guest.name}
                          {guest.partySize > 1 && (
                            <span className="ms-1 font-normal text-zinc-500 dark:text-zinc-400">
                              ({guest.partySize})
                            </span>
                          )}
                        </p>
                        <p
                          className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500"
                          dir="ltr"
                        >
                          {guest.phone}
                        </p>
                      </div>
                      <ContactBadge count={guest.contactCount} />
                    </div>

                    <span
                      className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[11px] font-medium ${getGroupColorClasses(guest.group)}`}
                    >
                      {guest.group}
                    </span>

                    {!readOnly && renderActions(guest)}
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}

      {callModalGuest && (
        <LogCallModal
          guest={callModalGuest}
          onClose={() => setCallModalGuestId(null)}
          onSubmit={(update) => {
            onLogCall(callModalGuest.id, update);
            setCallModalGuestId(null);
          }}
        />
      )}
    </div>
  );
}
