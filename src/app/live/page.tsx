import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getEvent } from "@/lib/db/events";
import { eventFromRow, type EventRow } from "@/lib/db/mappers";
import { PHASE_BADGE_CLASSES, PHASE_LABELS } from "@/lib/eventPhaseRules";
import { getSupabase } from "@/lib/supabase/server";
import type { EventRecord } from "@/types/event";

// Event dates are local to the venue.
const EVENT_TIME_ZONE = "Asia/Jerusalem";

function todayInEventTimeZone() {
  // en-CA formats as YYYY-MM-DD, like event_date.
  return new Intl.DateTimeFormat("en-CA", { timeZone: EVENT_TIME_ZONE }).format(
    new Date(),
  );
}

// Accepts a bare ID or a pasted link that ends with one, e.g. a /live/<id> or
// self check-in URL.
function parseEventId(input: string): string {
  const path = input.trim().split(/[?#]/)[0];
  return path.split("/").filter(Boolean).at(-1) ?? "";
}

// Staff land here after login and pick the event they're working: today's
// events (and any still running from last night) first, then upcoming ones.
// Any other event can be opened by its ID, which the form below submits as
// ?event=.
export default async function LiveEventPickerPage({
  searchParams,
}: PageProps<"/live">) {
  const user = await getCurrentUser();
  if (user?.role !== "staff" && user?.role !== "admin") redirect("/login");

  const { event: enteredId } = await searchParams;
  let lookupError: string | null = null;
  if (typeof enteredId === "string" && enteredId.trim()) {
    const id = parseEventId(enteredId);
    const event = id ? await getEvent(id) : null;
    if (event) redirect(`/live/${encodeURIComponent(event.id)}`);
    lookupError = "לא נמצא אירוע עם המזהה הזה. בדקו את המזהה ונסו שוב.";
  }

  const today = todayInEventTimeZone();
  const { data, error } = await getSupabase()
    .from("events")
    .select("*")
    .neq("phase", "POST_EVENT")
    .order("event_date");
  if (error) throw error;

  const todays: EventRecord[] = [];
  const upcoming: EventRecord[] = [];
  for (const event of (data as EventRow[]).map(eventFromRow)) {
    if (event.eventDate === today || event.phase === "LIVE") todays.push(event);
    else if (event.eventDate > today) upcoming.push(event);
    // Past events that were never closed are left out; open them by ID.
  }
  // The one running now is listed first.
  todays.sort((a, b) => Number(b.phase === "LIVE") - Number(a.phase === "LIVE"));

  return (
    <div className="min-h-screen bg-zinc-100 px-4 py-4 sm:px-6 dark:bg-zinc-950">
      <div className="mx-auto max-w-2xl">
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              בחירת אירוע
            </h1>
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              בחרו את האירוע שבו אתם עובדים כדי לפתוח את מסך קבלת האורחים
            </p>
          </div>
          <form action="/auth/signout" method="post" className="flex shrink-0 items-center gap-2">
            <span
              dir="ltr"
              className="hidden text-xs text-zinc-400 sm:inline dark:text-zinc-500"
            >
              {user.email}
            </span>
            <button
              type="submit"
              className="text-sm font-medium text-zinc-500 transition hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              יציאה
            </button>
          </form>
        </header>

        <EventSection
          title="האירועים של היום"
          events={todays}
          emptyText="אין אירועים היום."
        />

        {upcoming.length > 0 && (
          <EventSection title="אירועים קרובים" events={upcoming} />
        )}

        <section>
          <h2 className="mb-2 text-base font-semibold text-zinc-800 dark:text-zinc-100">
            כניסה לפי מזהה אירוע
          </h2>
          {/* A plain GET form, so it works before the page hydrates. */}
          <form
            action="/live"
            className="flex flex-col gap-2 rounded-xl bg-white p-4 shadow-md ring-1 ring-black/5 dark:bg-zinc-900"
          >
            <label
              htmlFor="event-id"
              className="text-xs font-semibold text-zinc-600 dark:text-zinc-300"
            >
              מזהה האירוע (או קישור למסך האירוע)
            </label>
            <div className="flex gap-2">
              <input
                id="event-id"
                name="event"
                required
                dir="ltr"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                defaultValue={typeof enteredId === "string" ? enteredId : ""}
                className="h-12 min-w-0 flex-1 rounded-lg border-0 bg-white px-3 text-base text-zinc-900 outline-none ring-1 ring-inset ring-zinc-200 transition focus:ring-2 focus:ring-indigo-500/50 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700"
              />
              <button
                type="submit"
                className="h-12 shrink-0 rounded-lg bg-indigo-600 px-5 text-sm font-semibold text-white shadow transition hover:bg-indigo-700"
              >
                פתיחה
              </button>
            </div>
            {lookupError && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
                {lookupError}
              </p>
            )}
          </form>
        </section>
      </div>
    </div>
  );
}

function EventSection({
  title,
  events,
  emptyText,
}: {
  title: string;
  events: EventRecord[];
  emptyText?: string;
}) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-base font-semibold text-zinc-800 dark:text-zinc-100">
        {title}
      </h2>
      <div className="overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-black/5 dark:bg-zinc-900">
        {events.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {emptyText}
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {events.map((event) => (
              <li key={event.id}>
                <Link
                  href={`/live/${encodeURIComponent(event.id)}`}
                  className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                      {event.coupleNames}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                      {event.eventDate}
                      {event.venue && ` · ${event.venue}`}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${PHASE_BADGE_CLASSES[event.phase]}`}
                  >
                    {PHASE_LABELS[event.phase]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
