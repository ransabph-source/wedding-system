import "server-only";
import type { User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/server";
import { eventFromRow, type EventRow } from "@/lib/db/mappers";
import type { ClientAccount } from "@/types/client";

// Supabase's default minimum; raise it here if the project's auth settings do.
export const MIN_PASSWORD_LENGTH = 6;

const USERS_PAGE_SIZE = 1000;

// Emails live in auth.users, which only the Auth admin API can read.
export async function listAuthUsers(): Promise<Map<string, User>> {
  const users = new Map<string, User>();
  for (let page = 1; ; page++) {
    const { data, error } = await getSupabase().auth.admin.listUsers({
      page,
      perPage: USERS_PAGE_SIZE,
    });
    if (error) throw error;
    for (const user of data.users) users.set(user.id, user);
    if (data.users.length < USERS_PAGE_SIZE) return users;
  }
}

// Every 'couple' account, newest first, then every event that isn't attached
// to one (no user_id, or a user who isn't a couple). Accounts are listed by
// profile rather than by event so an account whose event is gone can still be
// managed.
export async function listClients(): Promise<ClientAccount[]> {
  const supabase = getSupabase();
  const [profiles, events, users] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, created_at")
      .eq("role", "couple")
      .order("created_at", { ascending: false }),
    supabase.from("events").select("*").order("event_date"),
    listAuthUsers(),
  ]);
  if (profiles.error) throw profiles.error;
  if (events.error) throw events.error;

  type Row = EventRow & { user_id: string | null; created_at: string };
  const coupleProfiles = profiles.data as { id: string; created_at: string }[];
  const coupleIds = new Set(coupleProfiles.map((profile) => profile.id));
  const eventsByUser = new Map<string, Row[]>();
  const unlinkedEvents: Row[] = [];
  for (const row of events.data as Row[]) {
    if (row.user_id && coupleIds.has(row.user_id)) {
      const list = eventsByUser.get(row.user_id) ?? [];
      list.push(row);
      eventsByUser.set(row.user_id, list);
    } else {
      unlinkedEvents.push(row);
    }
  }

  const accounts = coupleProfiles.map(
    (profile): ClientAccount => {
      const user = users.get(profile.id);
      const clientEvents = (eventsByUser.get(profile.id) ?? []).map(
        eventFromRow,
      );
      return {
        key: profile.id,
        userId: profile.id,
        email: user?.email,
        coupleNames:
          clientEvents[0]?.coupleNames ??
          (user?.user_metadata?.couple_names as string | undefined) ??
          "",
        createdAt: profile.created_at,
        events: clientEvents,
      };
    },
  );

  const unlinked = unlinkedEvents.map((row): ClientAccount => {
    const event = eventFromRow(row);
    return {
      key: `event:${event.id}`,
      userId: null,
      email: undefined,
      coupleNames: event.coupleNames,
      createdAt: row.created_at,
      events: [event],
    };
  });

  return [...accounts, ...unlinked];
}

// True only for 'couple' accounts, so these routes can't touch admins or staff.
export async function isCoupleAccount(userId: string): Promise<boolean> {
  const { data, error } = await getSupabase()
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle<{ role: string }>();
  if (error) throw error;
  return data?.role === "couple";
}
