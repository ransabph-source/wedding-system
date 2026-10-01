import type { LoadStatus } from "@/lib/eventEngine";

// Full-page placeholder shown while an event's data loads, or if it failed.
export default function EventDataStatus({
  status,
}: {
  status: Exclude<LoadStatus, "ready">;
}) {
  return (
    <div className="grid min-h-[50vh] place-items-center px-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
      {status === "loading" ? (
        <p>טוען נתונים...</p>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <p className="font-semibold text-red-600 dark:text-red-400">
            טעינת נתוני האירוע נכשלה.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-white transition hover:bg-indigo-700"
          >
            נסו שוב
          </button>
        </div>
      )}
    </div>
  );
}
