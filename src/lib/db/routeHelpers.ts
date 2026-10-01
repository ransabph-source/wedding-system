import "server-only";
import {
  isAuthApiError,
  type AuthError,
  type PostgrestError,
} from "@supabase/supabase-js";
import {
  canAccessEvent,
  getCurrentUser,
  type CurrentUser,
  type EventAccess,
} from "@/lib/auth";
import {
  isSectionEditableForCouple,
  type CoupleSection,
} from "@/lib/eventPhaseRules";
import { getSupabase } from "@/lib/supabase/server";
import type { EventPhase } from "@/types/event";

export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

// Postgres classes 22 (bad data) and 23 (constraint violations) are caused by
// the request, so they're reported as 400s; anything else is a server fault.
export function dbError(error: PostgrestError) {
  const status = /^2[23]/.test(error.code) ? 400 : 500;
  return jsonError(error.message, status);
}

// Returns an error response unless the request comes from a signed-in admin.
export async function requireAdmin(): Promise<Response | null> {
  const user = await getCurrentUser();
  if (!user) return jsonError("Not signed in", 401);
  if (user.role !== "admin") return jsonError("Admins only", 403);
  return null;
}

// Returns the signed-in user if they may access the event, otherwise an error
// response.
export async function authorizeEvent(
  eventId: string,
  access: EventAccess,
): Promise<CurrentUser | Response> {
  const user = await getCurrentUser();
  if (!user) return jsonError("Not signed in", 401);
  if (!(await canAccessEvent(user, eventId, access))) {
    return jsonError("You don't have access to this event", 403);
  }
  return user;
}

// Auth API 4xx errors (e.g. a duplicate email or weak password) pass through;
// anything else is a server fault.
export function authError(error: AuthError) {
  const status =
    isAuthApiError(error) && error.status < 500 ? error.status : 500;
  return jsonError(error.message, status);
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

// Turns thrown errors (e.g. missing env vars) into a JSON 500 instead of an
// HTML error page, so the client can always parse the response.
export function withErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
) {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error(error);
      return jsonError(
        error instanceof Error ? error.message : "Internal server error",
        500,
      );
    }
  };
}

type EventScopedContext = { params: Promise<{ eventId: string }> };

interface CollectionConfig<Item extends { id: string }, Row> {
  table: string;
  fromRow: (row: Row) => Item;
  toRow: (eventId: string, item: Item) => Row;
  // Columns staff may change through PUT. Without it, staff are read-only.
  staffWritableColumns?: (keyof Row & string)[];
  // The couple-portal section this collection belongs to, which decides in
  // which event phases couples may change it (see eventPhaseRules).
  coupleSection: CoupleSection;
  // Columns that belong to a different section, e.g. a guest's table belongs
  // to "seating" so it stays editable after the guest list is locked.
  coupleColumnSections?: Partial<Record<keyof Row & string, CoupleSection>>;
}

function isItemArray(value: unknown): value is { id: string }[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "object" && item !== null && typeof item.id === "string",
    )
  );
}

// PostgREST puts filters in the URL, so large ID lists are split to stay
// under URL length limits.
const ID_CHUNK_SIZE = 100;

async function getEventPhase(eventId: string): Promise<EventPhase | null> {
  const { data, error } = await getSupabase()
    .from("events")
    .select("phase")
    .eq("id", eventId)
    .maybeSingle<{ phase: EventPhase }>();
  if (error) throw error;
  return data?.phase ?? null;
}

// A 403 if the event's phase locks any of the sections for couples.
async function checkCouplePhase(
  eventId: string,
  sections: Iterable<CoupleSection>,
): Promise<Response | null> {
  const phase = await getEventPhase(eventId);
  if (!phase) return jsonError("Event not found", 404);
  for (const section of sections) {
    if (!isSectionEditableForCouple(phase, section)) {
      return jsonError(
        `The event is in the ${phase} phase, so ${section} can't be edited`,
        403,
      );
    }
  }
  return null;
}

// REST handlers for a per-event collection (guests, tables, zones):
//   GET    → list the event's items in insertion order
//   POST   → create items (body: Item[]); fails if an ID already exists
//   PUT    → create or replace items by ID (body: Item[])
//   DELETE → remove items (body: { ids: string[] })
// Reads need "view" access to the event and writes need "edit", except that
// staff may PUT changes to staffWritableColumns of existing items. A couple's
// writes must also be allowed by the event's phase; admins bypass phase locks.
export function createCollectionHandlers<Item extends { id: string }, Row>({
  table,
  fromRow,
  toRow,
  staffWritableColumns,
  coupleSection,
  coupleColumnSections = {},
}: CollectionConfig<Item, Row>) {
  async function readItems(request: Request, eventId: string) {
    const body = await readJson(request);
    if (!isItemArray(body)) return null;
    return (body as Item[]).map(
      (item) => toRow(eventId, item) as Record<string, unknown>,
    );
  }

  // Applies only the staff-writable columns, and never creates items.
  async function staffUpdate(eventId: string, rows: Record<string, unknown>[]) {
    if (!staffWritableColumns) {
      return jsonError("You don't have access to this event", 403);
    }
    const updated: Row[] = [];
    for (const row of rows) {
      const changes = Object.fromEntries(
        staffWritableColumns.map((column) => [column, row[column]]),
      );
      const { data, error } = await getSupabase()
        .from(table)
        .update(changes)
        .eq("event_id", eventId)
        .eq("id", row.id)
        .select();
      if (error) return dbError(error);
      updated.push(...(data as Row[]));
    }
    return Response.json(updated.map(fromRow));
  }

  // The sections a couple's PUT touches: new items count as the collection's
  // section, and changed columns of existing items as their own section.
  async function sectionsChangedBy(
    eventId: string,
    rows: Record<string, unknown>[],
  ): Promise<Set<CoupleSection>> {
    const existing = new Map<string, Record<string, unknown>>();
    for (let i = 0; i < rows.length; i += ID_CHUNK_SIZE) {
      const { data, error } = await getSupabase()
        .from(table)
        .select("*")
        .eq("event_id", eventId)
        .in(
          "id",
          rows.slice(i, i + ID_CHUNK_SIZE).map((row) => row.id),
        );
      if (error) throw error;
      for (const row of data as Record<string, unknown>[]) {
        existing.set(row.id as string, row);
      }
    }

    const columnSections = coupleColumnSections as Record<
      string,
      CoupleSection | undefined
    >;
    const sections = new Set<CoupleSection>();
    for (const row of rows) {
      const current = existing.get(row.id as string);
      if (!current) {
        sections.add(coupleSection);
        continue;
      }
      for (const [column, value] of Object.entries(row)) {
        if (JSON.stringify(value) !== JSON.stringify(current[column])) {
          sections.add(columnSections[column] ?? coupleSection);
        }
      }
    }
    return sections;
  }

  const GET = withErrorHandling(
    async (_request: Request, ctx: EventScopedContext) => {
      const { eventId } = await ctx.params;
      const auth = await authorizeEvent(eventId, "view");
      if (auth instanceof Response) return auth;
      const { data, error } = await getSupabase()
        .from(table)
        .select("*")
        .eq("event_id", eventId)
        .order("seq");
      if (error) return dbError(error);
      return Response.json((data as Row[]).map(fromRow));
    },
  );

  const POST = withErrorHandling(
    async (request: Request, ctx: EventScopedContext) => {
      const { eventId } = await ctx.params;
      const auth = await authorizeEvent(eventId, "edit");
      if (auth instanceof Response) return auth;
      if (auth.role === "couple") {
        const locked = await checkCouplePhase(eventId, [coupleSection]);
        if (locked) return locked;
      }
      const rows = await readItems(request, eventId);
      if (!rows) return jsonError("Expected an array of items with IDs", 400);
      const { data, error } = await getSupabase()
        .from(table)
        .insert(rows)
        .select();
      if (error) return dbError(error);
      return Response.json((data as Row[]).map(fromRow), { status: 201 });
    },
  );

  const PUT = withErrorHandling(
    async (request: Request, ctx: EventScopedContext) => {
      const { eventId } = await ctx.params;
      const auth = await authorizeEvent(eventId, "view");
      if (auth instanceof Response) return auth;
      const rows = await readItems(request, eventId);
      if (!rows) return jsonError("Expected an array of items with IDs", 400);
      if (auth.role === "staff") return staffUpdate(eventId, rows);
      if (!(await canAccessEvent(auth, eventId, "edit"))) {
        return jsonError("You don't have access to this event", 403);
      }
      if (auth.role === "couple") {
        const locked = await checkCouplePhase(
          eventId,
          await sectionsChangedBy(eventId, rows),
        );
        if (locked) return locked;
      }
      const { data, error } = await getSupabase()
        .from(table)
        .upsert(rows, { onConflict: "event_id,id" })
        .select();
      if (error) return dbError(error);
      return Response.json((data as Row[]).map(fromRow));
    },
  );

  const DELETE = withErrorHandling(
    async (request: Request, ctx: EventScopedContext) => {
      const { eventId } = await ctx.params;
      const auth = await authorizeEvent(eventId, "edit");
      if (auth instanceof Response) return auth;
      if (auth.role === "couple") {
        const locked = await checkCouplePhase(eventId, [coupleSection]);
        if (locked) return locked;
      }
      const body = (await readJson(request)) as { ids?: unknown } | undefined;
      const ids = body?.ids;
      if (!Array.isArray(ids) || !ids.every((id) => typeof id === "string")) {
        return jsonError("Expected { ids: string[] }", 400);
      }
      for (let i = 0; i < ids.length; i += ID_CHUNK_SIZE) {
        const { error } = await getSupabase()
          .from(table)
          .delete()
          .eq("event_id", eventId)
          .in("id", ids.slice(i, i + ID_CHUNK_SIZE));
        if (error) return dbError(error);
      }
      return new Response(null, { status: 204 });
    },
  );

  return { GET, POST, PUT, DELETE };
}
