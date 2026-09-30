"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { MOCK_EVENTS } from "@/lib/mockEvents";
import { createDemoGuests } from "@/lib/mockGuests";
import type { Guest } from "@/types/guest";
import type { EventPhase, UserRole } from "@/types/event";

export interface ActivityLogEntry {
  id: string;
  eventId: string;
  message: string;
  timestamp: number;
}

type GuestsUpdater = Guest[] | ((prev: Guest[]) => Guest[]);

interface EventEngineContextValue {
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  // True only for a logged-in admin who has the "תצוגת מנהל" switch on, so
  // admin-only UI can be gated on this flag alone without leaking to couples.
  isAdminMode: boolean;
  setIsAdminMode: (enabled: boolean) => void;
  getPhase: (eventId: string) => EventPhase;
  setPhase: (eventId: string, phase: EventPhase) => void;
  getGuests: (eventId: string) => Guest[];
  setGuests: (eventId: string, updater: GuestsUpdater) => void;
  getActivityLog: (eventId: string) => ActivityLogEntry[];
  logActivity: (eventId: string, message: string) => void;
}

const EventEngineContext = createContext<EventEngineContextValue | null>(
  null,
);

function initialPhases(): Record<string, EventPhase> {
  return Object.fromEntries(MOCK_EVENTS.map((event) => [event.id, event.phase]));
}

// Every mock event starts with the same demo guest list so admins can flip
// any event's phase in the debug panel and immediately see meaningful data.
function initialGuestsByEvent(): Record<string, Guest[]> {
  return Object.fromEntries(
    MOCK_EVENTS.map((event) => [event.id, createDemoGuests()]),
  );
}

export function EventEngineProvider({ children }: { children: ReactNode }) {
  const [userRole, setUserRole] = useState<UserRole>(null);
  // On by default so admins see admin-only features until they switch it off.
  const [adminModeEnabled, setIsAdminMode] = useState(true);
  const isAdminMode = userRole === "admin" && adminModeEnabled;
  const [phases, setPhases] = useState<Record<string, EventPhase>>(
    initialPhases,
  );
  const [guestsByEvent, setGuestsByEvent] = useState<Record<string, Guest[]>>(
    initialGuestsByEvent,
  );
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);

  const logActivity = useCallback((eventId: string, message: string) => {
    setActivityLog((prev) => [
      ...prev,
      { id: crypto.randomUUID(), eventId, message, timestamp: Date.now() },
    ]);
  }, []);

  const getPhase = useCallback(
    (eventId: string) => phases[eventId] ?? "SETUP",
    [phases],
  );

  const setPhase = useCallback(
    (eventId: string, phase: EventPhase) => {
      setPhases((prev) => ({ ...prev, [eventId]: phase }));

      if (phase === "RSVP_CAMPAIGN") {
        logActivity(
          eventId,
          "מבצע אישורי הגעה הופעל: נשלח גל SMS ראשון למוזמנים",
        );
      } else if (phase === "POST_EVENT") {
        const guests = guestsByEvent[eventId] ?? [];
        const arrivedCount = guests.filter((guest) => guest.arrived).length;
        logActivity(
          eventId,
          `נשלחו הודעות תודה (Mock) ל-${arrivedCount} אורחים שסומנו כ"הגיעו"`,
        );
      }
    },
    [guestsByEvent, logActivity],
  );

  const getGuests = useCallback(
    (eventId: string) => guestsByEvent[eventId] ?? [],
    [guestsByEvent],
  );

  const setGuests = useCallback(
    (eventId: string, updater: GuestsUpdater) => {
      setGuestsByEvent((prev) => {
        const current = prev[eventId] ?? [];
        const next =
          typeof updater === "function"
            ? (updater as (p: Guest[]) => Guest[])(current)
            : updater;
        return { ...prev, [eventId]: next };
      });
    },
    [],
  );

  const getActivityLog = useCallback(
    (eventId: string) =>
      activityLog.filter((entry) => entry.eventId === eventId),
    [activityLog],
  );

  const value = useMemo<EventEngineContextValue>(
    () => ({
      userRole,
      setUserRole,
      isAdminMode,
      setIsAdminMode,
      getPhase,
      setPhase,
      getGuests,
      setGuests,
      getActivityLog,
      logActivity,
    }),
    [userRole, isAdminMode, getPhase, setPhase, getGuests, setGuests, getActivityLog, logActivity],
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

export function useAdminMode() {
  const { userRole, isAdminMode, setIsAdminMode } = useEventEngine();
  return {
    isAdminMode,
    setIsAdminMode,
    // Only admins get the switch; for everyone else isAdminMode stays false.
    canToggleAdminMode: userRole === "admin",
  };
}
