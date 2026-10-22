"use client";

import { useEffect, useState, useTransition } from "react";
import {
  getAutomationTimeline,
  type AutomationTimelineResult,
} from "./timelineActions";

// The event's RSVP automation timeline (see lib/rsvpSchedule): the day and
// Israel hour of each of the six steps, flagging the ones a rest day pushed
// back and a timeline that had to start early to finish by T-7.

interface AutomationTimelineProps {
  eventId: string;
  // Reloads the timeline when the event date changes.
  eventDate: string;
  className?: string;
}

const STEP_LABELS = [
  { label: "הזמנה ראשונה", time: "10:00" },
  { label: "תזכורת ראשונה", time: "15:00" },
  { label: "תזכורת שנייה", time: "18:00" },
  { label: "יום שיחות 1 מתוך 3", time: "דוח ב-10:00" },
  { label: "יום שיחות 2 מתוך 3", time: "דוח ב-10:00" },
  { label: "יום שיחות 3 מתוך 3", time: "דוח ב-10:00" },
];

const dateFormat = new Intl.DateTimeFormat("he-IL", {
  timeZone: "UTC",
  weekday: "short",
  day: "numeric",
  month: "numeric",
  year: "numeric",
});

function formatDate(date: string): string {
  return dateFormat.format(new Date(`${date}T00:00:00Z`));
}

function israelToday(): string {
  // en-CA formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
  }).format(new Date());
}

export default function AutomationTimeline({
  eventId,
  eventDate,
  className = "",
}: AutomationTimelineProps) {
  const [result, setResult] = useState<AutomationTimelineResult | null>(null);
  const [failed, setFailed] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      try {
        setResult(await getAutomationTimeline(eventId));
        setFailed(false);
      } catch {
        setFailed(true);
      }
    });
  }, [eventId, eventDate]);

  let body;
  if (failed || (result && !result.ok)) {
    body = (
      <p className="text-sm text-red-600 dark:text-red-400">
        לא ניתן לטעון את לוח הזמנים.
      </p>
    );
  } else if (!result || isPending) {
    body = <p className="text-sm text-zinc-500 dark:text-zinc-400">טוען…</p>;
  } else {
    const { schedule } = result;
    const today = israelToday();
    const steps = [...schedule.stages, ...schedule.callDays];
    body = (
      <>
        {schedule.startDaysBefore > 24 && (
          <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
            ⏪ התהליך מתחיל {schedule.startDaysBefore} ימים לפני האירוע (במקום
            24) בגלל ימי מנוחה, כדי שיסתיים עד {formatDate(schedule.deadline)}{" "}
            (שבוע לפני האירוע).
          </p>
        )}
        <ol className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
          {steps.map((step, index) => {
            const { label, time } = STEP_LABELS[index];
            const isPast = step.date < today;
            const isToday = step.date === today;
            return (
              <li
                key={label}
                className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 py-2 text-sm ${
                  isPast ? "text-zinc-400 dark:text-zinc-500" : "text-zinc-800 dark:text-zinc-100"
                }`}
              >
                <span className="font-medium">
                  {label}
                  {isToday && (
                    <span className="ms-2 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                      היום
                    </span>
                  )}
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  <span dir="ltr" className="tabular-nums">
                    {formatDate(step.date)}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {time}
                  </span>
                  {step.shifted && (
                    <span
                      className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
                      title="המועד המקורי חל ביום מנוחה (שישי, שבת, חג או ערב חג, יום השואה או יום הזיכרון), ולכן נדחה ליום העבודה הבא"
                    >
                      ⚠ נדחה בגלל יום מנוחה
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ol>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          קו אדום: כל השלבים מסתיימים עד {formatDate(schedule.deadline)}. אין
          שליחות ודוחות בימי מנוחה.
        </p>
      </>
    );
  }

  return (
    <section className={className}>
      <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
        לוח זמנים לאוטומציה
      </h2>
      <p className="mb-2 mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
        המועדים הצפויים להודעות האוטומטיות ולימי השיחות לאירוע הזה.
      </p>
      {body}
    </section>
  );
}
