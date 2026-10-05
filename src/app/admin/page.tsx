"use client";

import { useState } from "react";
import Link from "next/link";
import SelfCheckInQrModal from "@/components/SelfCheckInQrModal";
import { useEventEngine } from "@/lib/eventEngine";
import {
  PHASE_BADGE_CLASSES,
  PHASE_LABELS,
  PHASE_ORDER,
} from "@/lib/eventPhaseRules";
import type { EventPhase } from "@/types/event";
import LeadsPanel from "./LeadsPanel";

type AdminTab = "leads" | "closedEvents";

const eventStatusLabels: Record<string, string> = {
  planning: "בתכנון",
  confirmed: "מאושר",
  completed: "הסתיים",
};

const eventStatusClasses: Record<string, string> = {
  planning:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  confirmed:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  completed: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

function tabButtonClasses(active: boolean) {
  return `min-h-10 flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition sm:min-h-0 sm:flex-none ${
    active
      ? "bg-indigo-600 text-white shadow"
      : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
  }`;
}

export default function AdminCrmPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("closedEvents");
  const [checkInQrEventId, setCheckInQrEventId] = useState<string | null>(
    null,
  );
  const {
    events,
    eventsStatus,
    getPhase,
    setPhase,
    getActivityLog,
    logActivity,
  } = useEventEngine();

  return (
    <div className="px-3 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-3">
          <h1 className="text-lg font-bold sm:text-xl text-zinc-900 dark:text-zinc-50">
            לוח בקרה - הנהלה
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            ניהול לידים ואירועים סגורים במקום אחד
          </p>
        </header>

        <nav className="mb-4 flex w-full gap-1 rounded-xl sm:inline-flex sm:w-auto bg-white p-1 shadow-sm ring-1 ring-black/5 dark:bg-zinc-900">
          <button
            type="button"
            onClick={() => setActiveTab("closedEvents")}
            className={tabButtonClasses(activeTab === "closedEvents")}
          >
            אירועים סגורים
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("leads")}
            className={tabButtonClasses(activeTab === "leads")}
          >
            ניהול לידים/מכירות
          </button>
        </nav>

        {activeTab === "leads" ? (
          <LeadsPanel />
        ) : (
          <section>
            <h2 className="mb-2 text-base font-semibold text-zinc-800 dark:text-zinc-100">
              אירועים סגורים
            </h2>

            <div className="overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-black/5 dark:bg-zinc-900">
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {eventsStatus !== "ready" && (
                  <li className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                    {eventsStatus === "loading"
                      ? "טוען אירועים..."
                      : "טעינת האירועים נכשלה."}
                  </li>
                )}
                {events.map((event) => {
                  const phase = getPhase(event.id);
                  const lastLog = getActivityLog(event.id).at(-1);

                  return (
                    <li key={event.id} className="flex flex-col gap-2 px-3 py-3 sm:px-4 sm:py-2.5">
                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
                        <Link
                          href={`/couple/${event.id}`}
                          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg transition hover:opacity-80"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                              {event.coupleNames}
                            </p>
                            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                              {event.venue} · {event.eventDate} ·{" "}
                              {event.guestsInvited} מוזמנים
                            </p>
                          </div>

                          <span
                            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${eventStatusClasses[event.status]}`}
                          >
                            {eventStatusLabels[event.status]}
                          </span>
                        </Link>

                        <Link
                          href={`/live/${event.id}`}
                          className="flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 px-3 py-1.5 text-sm font-semibold sm:min-h-0 sm:text-xs text-amber-700 transition hover:bg-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20"
                        >
                          כניסה למסך לייב (דיילות)
                        </Link>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800/50">
                        <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                          Debug: שלב האירוע
                        </span>
                        <select
                          value={phase}
                          onChange={(e) =>
                            setPhase(event.id, e.target.value as EventPhase)
                          }
                          className={`min-h-9 rounded-full border-0 px-2.5 py-1 text-xs font-semibold sm:min-h-0 outline-none ring-1 ring-inset ring-black/5 transition focus:ring-2 focus:ring-indigo-500/50 ${PHASE_BADGE_CLASSES[phase]}`}
                        >
                          {PHASE_ORDER.map((p) => (
                            <option key={p} value={p}>
                              {PHASE_LABELS[p]}
                            </option>
                          ))}
                        </select>

                        {phase === "RSVP_CAMPAIGN" && (
                          <button
                            type="button"
                            onClick={() =>
                              logActivity(
                                event.id,
                                "נשלח גל SMS נוסף (Mock) למוזמנים שטרם אישרו",
                              )
                            }
                            className="min-h-9 rounded-lg bg-violet-100 px-2.5 py-1 text-xs sm:min-h-0 font-semibold text-violet-700 transition hover:bg-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:hover:bg-violet-500/20"
                          >
                            שלח גל SMS נוסף (Mock)
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setCheckInQrEventId(event.id)}
                          className="min-h-9 rounded-lg bg-zinc-200 px-2.5 py-1 text-xs sm:min-h-0 font-semibold text-zinc-700 transition hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600"
                        >
                          QR לצ&apos;ק-אין עצמאי
                        </button>

                        {lastLog && (
                          <span className="w-full text-xs text-zinc-400 dark:text-zinc-500">
                            פעילות אחרונה: {lastLog.message}
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        )}
      </div>

      {checkInQrEventId && (
        <SelfCheckInQrModal
          eventId={checkInQrEventId}
          onClose={() => setCheckInQrEventId(null)}
        />
      )}
    </div>
  );
}
