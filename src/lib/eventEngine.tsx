"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  fetchEventCollections,
  fetchEvents,
  syncCollection,
  updateEventPhase,
  type EventCollection,
  type EventCollections,
} from "@/lib/api";
import type { Guest } from "@/types/guest";
import type { EventPhase, EventRecord, UserRole } from "@/types/event";
import type { SeatingTable, SeatingZone } from "@/types/seating";

export interface ActivityLogEntry {
  id: string;
  eventId: string;
  message: string;
  timestamp: number;
}

export type LoadStatus = "loading" | "ready" | "error";

type Updater<T> = T | ((prev: T) => T);
type GuestsUpdater = Updater<Guest[]>;

interface EventEngineContextValue {
  userRole: UserRole;
  // True only for a logged-in admin who has the "תצוגת מנהל" switch on, so
  // admin-only UI can be gated on this flag alone without leaking to couples.
  isAdminMode: boolean;
  setIsAdminMode: (enabled: boolean) => void;
  events: EventRecord[];
  eventsStatus: LoadStatus;
  // Re-fetches the event list, e.g. after an event is created elsewhere.
  refreshEvents: () => Promise<void>;
  getEvent: (eventId: string) => EventRecord | undefined;
  getPhase: (eventId: string) => EventPhase;
  setPhase: (eventId: string, phase: EventPhase) => void;
  getEventStatus: (eventId: string) => LoadStatus;
  loadEvent: (eventId: string) => Promise<void>;
  getGuests: (eventId: string) => Guest[];
  setGuests: (eventId: string, updater: GuestsUpdater) => void;
  getTables: (eventId: string) => SeatingTable[];
  setTables: (eventId: string, updater: Updater<SeatingTable[]>) => void;
  getZones: (eventId: string) => SeatingZone[];
  setZones: (eventId: string, updater: Updater<SeatingZone[]>) => void;
  getActivityLog: (eventId: string) => ActivityLogEntry[];
  logActivity: (eventId: string, message: string) => void;
  // Set when a save fails; the affected event is then reloaded from the server.
  syncError: string | null;
  dismissSyncError: () => void;
}

const EventEngineContext = createContext<EventEngineContextValue | null>(
  null,
);

const EMPTY: never[] = [];

function applyUpdater<T>(updater: Updater<T>, current: T): T {
  return typeof updater === "function"
    ? (updater as (prev: T) => T)(current)
    : updater;
}

// userRole comes from the server session. The root layout remounts the
// provider when the signed-in user changes, so no data carries over.
export function EventEngineProvider({
  userRole,
  children,
}: {
  userRole: UserRole;
  children: ReactNode;
}) {
  // On by default so admins see admin-only features until they switch it off.
  const [adminModeEnabled, setIsAdminMode] = useState(true);
  const isAdminMode = userRole === "admin" && adminModeEnabled;
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [eventsStatus, setEventsStatus] = useState<LoadStatus>("loading");
  const [eventStatuses, setEventStatuses] = useState<
    Record<string, LoadStatus>
  >({});
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Collections live in a ref as well as state so consecutive updates within
  // one handler (e.g. delete a table, then unseat its guests) each build on
  // the previous one, and so each update can be diffed and persisted outside
  // of a React state updater, which must stay pure.
  const [collections, setCollectionsState] = useState<
    Record<string, EventCollections>
  >({});
  const collectionsRef = useRef(collections);
  const eventStatusesRef = useRef(eventStatuses);

  // Writes for an event run one at a time, in the order they were made, so a
  // guest is never assigned to a zone before the zone itself is saved.
  const writeQueueRef = useRef<Record<string, Promise<void>>>({});
  const pendingWritesRef = useRef<Record<string, number>>({});
  // Bumped on every write so a reload can tell if it raced one.
  const writeVersionRef = useRef<Record<string, number>>({});
  const reloadWhenIdleRef = useRef(new Set<string>());

  // Signed-out visitors (e.g. guests checking in) can't read events.
  useEffect(() => {
    if (!userRole) return;
    fetchEvents()
      .then((loaded) => {
        setEvents(loaded);
        setEventsStatus("ready");
      })
      .catch((error: unknown) => {
        console.error(error);
        setEventsStatus("error");
      });
  }, [userRole]);

  const refreshEvents = useCallback(async () => {
    setEvents(await fetchEvents());
    setEventsStatus("ready");
  }, []);

  const setEventStatus = useCallback((eventId: string, status: LoadStatus) => {
    eventStatusesRef.current = { ...eventStatusesRef.current, [eventId]: status };
    setEventStatuses(eventStatusesRef.current);
  }, []);

  const writeCollections = useCallback(
    (eventId: string, data: EventCollections) => {
      collectionsRef.current = { ...collectionsRef.current, [eventId]: data };
      setCollectionsState(collectionsRef.current);
    },
    [],
  );

  // Fetches the event's collections from the server. A snapshot is only
  // applied if no local write started while it was in flight; otherwise it
  // could roll back edits the server hadn't received yet, so the reload is
  // retried once the write queue drains.
  const loadEvent = useCallback(
    async (eventId: string) => {
      for (;;) {
        const versionAtStart = writeVersionRef.current[eventId] ?? 0;
        let data: EventCollections;
        try {
          data = await fetchEventCollections(eventId);
        } catch (error) {
          console.error(error);
          if (eventStatusesRef.current[eventId] !== "ready") {
            setEventStatus(eventId, "error");
          }
          return;
        }

        if ((writeVersionRef.current[eventId] ?? 0) === versionAtStart) {
          writeCollections(eventId, data);
          setEventStatus(eventId, "ready");
          return;
        }
        if ((pendingWritesRef.current[eventId] ?? 0) > 0) {
          reloadWhenIdleRef.current.add(eventId);
          return;
        }
        // A write started and finished mid-fetch; fetch again to include it.
      }
    },
    [setEventStatus, writeCollections],
  );

  const enqueueWrite = useCallback(
    (eventId: string, write: () => Promise<void>) => {
      pendingWritesRef.current[eventId] =
        (pendingWritesRef.current[eventId] ?? 0) + 1;
      writeVersionRef.current[eventId] =
        (writeVersionRef.current[eventId] ?? 0) + 1;

      const run = async () => {
        try {
          await write();
        } catch (error) {
          console.error(error);
          setSyncError("שמירת השינויים נכשלה. הנתונים נטענו מחדש מהשרת.");
          reloadWhenIdleRef.current.add(eventId);
        } finally {
          pendingWritesRef.current[eventId] -= 1;
          if (
            pendingWritesRef.current[eventId] === 0 &&
            reloadWhenIdleRef.current.delete(eventId)
          ) {
            void loadEvent(eventId);
          }
        }
      };

      writeQueueRef.current[eventId] = (
        writeQueueRef.current[eventId] ?? Promise.resolve()
      ).then(run);
    },
    [loadEvent],
  );

  // Applies an update locally right away, then persists the diff.
  const updateCollection = useCallback(
    <K extends EventCollection>(
      eventId: string,
      key: K,
      updater: Updater<EventCollections[K]>,
    ) => {
      const current = collectionsRef.current[eventId];
      if (!current) {
        console.warn(`Ignoring ${key} update for unloaded event ${eventId}`);
        return;
      }
      const prev = current[key];
      const next = applyUpdater(updater, prev);
      if (next === prev) return;

      writeCollections(eventId, { ...current, [key]: next });
      enqueueWrite(eventId, () =>
        syncCollection<{ id: string }>(eventId, key, prev, next),
      );
    },
    [enqueueWrite, writeCollections],
  );

  const logActivity = useCallback((eventId: string, message: string) => {
    setActivityLog((prev) => [
      ...prev,
      { id: crypto.randomUUID(), eventId, message, timestamp: Date.now() },
    ]);
  }, []);

  const getEvent = useCallback(
    (eventId: string) => events.find((event) => event.id === eventId),
    [events],
  );

  const getPhase = useCallback(
    (eventId: string) => getEvent(eventId)?.phase ?? "SETUP",
    [getEvent],
  );

  const setPhase = useCallback(
    (eventId: string, phase: EventPhase) => {
      setEvents((prev) =>
        prev.map((event) =>
          event.id === eventId ? { ...event, phase } : event,
        ),
      );
      updateEventPhase(eventId, phase).catch((error: unknown) => {
        console.error(error);
        setSyncError("שמירת שלב האירוע נכשלה. הנתונים נטענו מחדש מהשרת.");
        fetchEvents().then(setEvents, console.error);
      });

      if (phase === "RSVP_CAMPAIGN") {
        logActivity(
          eventId,
          "מבצע אישורי הגעה הופעל: נשלח גל SMS ראשון למוזמנים",
        );
      } else if (phase === "POST_EVENT") {
        const guests = collectionsRef.current[eventId]?.guests ?? [];
        const arrivedCount = guests.filter((guest) => guest.arrived).length;
        logActivity(
          eventId,
          `נשלחו הודעות תודה (Mock) ל-${arrivedCount} אורחים שסומנו כ"הגיעו"`,
        );
      }
    },
    [logActivity],
  );

  const getEventStatus = useCallback(
    (eventId: string) => eventStatuses[eventId] ?? "loading",
    [eventStatuses],
  );

  const getGuests = useCallback(
    (eventId: string) => collections[eventId]?.guests ?? EMPTY,
    [collections],
  );
  const getTables = useCallback(
    (eventId: string) => collections[eventId]?.tables ?? EMPTY,
    [collections],
  );
  const getZones = useCallback(
    (eventId: string) => collections[eventId]?.zones ?? EMPTY,
    [collections],
  );

  const setGuests = useCallback(
    (eventId: string, updater: GuestsUpdater) =>
      updateCollection(eventId, "guests", updater),
    [updateCollection],
  );
  const setTables = useCallback(
    (eventId: string, updater: Updater<SeatingTable[]>) =>
      updateCollection(eventId, "tables", updater),
    [updateCollection],
  );
  const setZones = useCallback(
    (eventId: string, updater: Updater<SeatingZone[]>) =>
      updateCollection(eventId, "zones", updater),
    [updateCollection],
  );

  const getActivityLog = useCallback(
    (eventId: string) =>
      activityLog.filter((entry) => entry.eventId === eventId),
    [activityLog],
  );

  const dismissSyncError = useCallback(() => setSyncError(null), []);

  const value = useMemo<EventEngineContextValue>(
    () => ({
      userRole,
      isAdminMode,
      setIsAdminMode,
      events,
      eventsStatus,
      refreshEvents,
      getEvent,
      getPhase,
      setPhase,
      getEventStatus,
      loadEvent,
      getGuests,
      setGuests,
      getTables,
      setTables,
      getZones,
      setZones,
      getActivityLog,
      logActivity,
      syncError,
      dismissSyncError,
    }),
    [
      userRole,
      isAdminMode,
      events,
      eventsStatus,
      refreshEvents,
      getEvent,
      getPhase,
      setPhase,
      getEventStatus,
      loadEvent,
      getGuests,
      setGuests,
      getTables,
      setTables,
      getZones,
      setZones,
      getActivityLog,
      logActivity,
      syncError,
      dismissSyncError,
    ],
  );

  return (
    <EventEngineContext.Provider value={value}>
      {children}
    </EventEngineContext.Provider>
  );
}

export function useEventEngine(): EventEngineContextValue {
  const ctx = useContext(EventEngineContext);
  if (!ctx) {
    throw new Error("useEventEngine must be used within an EventEngineProvider");
  }
  return ctx;
}

// Loads an event's guests, tables and zones from the server and reports
// progress. Pages shared across devices (e.g. the hostess dashboard while
// guests self check-in) pass refreshIntervalMs to pick up remote changes.
export function useEventData(
  eventId: string,
  { refreshIntervalMs }: { refreshIntervalMs?: number } = {},
): LoadStatus {
  const { loadEvent, getEventStatus, eventsStatus } = useEventEngine();

  useEffect(() => {
    void loadEvent(eventId);
    if (!refreshIntervalMs) return;
    const interval = setInterval(() => void loadEvent(eventId), refreshIntervalMs);
    return () => clearInterval(interval);
  }, [eventId, loadEvent, refreshIntervalMs]);

  const status = getEventStatus(eventId);
  if (status === "error" || eventsStatus === "error") return "error";
  return status === "ready" && eventsStatus === "ready" ? "ready" : "loading";
}

export function useAdminMode() {
  const { userRole, isAdminMode, setIsAdminMode } = useEventEngine();
  return {
    isAdminMode,
    setIsAdminMode,
    // Only admins get the switch; for everyone else isAdminMode stays false.
    canToggleAdminMode: userRole === "admin",
  };
}
