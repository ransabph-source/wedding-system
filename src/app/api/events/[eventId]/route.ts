import { getSupabase } from "@/lib/supabase/server";
import { getEvent } from "@/lib/db/events";
import { eventFromRow, eventToRow, type EventRow } from "@/lib/db/mappers";
import {
  authorizeEvent,
  dbError,
  jsonError,
  readJson,
  requireAdmin,
  withErrorHandling,
} from "@/lib/db/routeHelpers";
import type { EventRecord } from "@/types/event";

type Context = RouteContext<"/api/events/[eventId]">;

export const GET = withErrorHandling(async (_request: Request, ctx: Context) => {
  const { eventId } = await ctx.params;
  const auth = await authorizeEvent(eventId, "view");
  if (auth instanceof Response) return auth;
  const event = await getEvent(eventId);
  return event ? Response.json(event) : jsonError("Event not found", 404);
});

// Admins only, since the phase decides what couples may edit.
// Updates only the fields sent, e.g. { phase: "SEATING" }.
export const PUT = withErrorHandling(async (request: Request, ctx: Context) => {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { eventId } = await ctx.params;
  const body = await readJson(request);
  if (typeof body !== "object" || body === null) {
    return jsonError("Expected an event object", 400);
  }
  const updates = eventToRow(body as Partial<EventRecord>);
  delete updates.id;
  const { data, error } = await getSupabase()
    .from("events")
    .update(updates)
    .eq("id", eventId)
    .select()
    .maybeSingle<EventRow>();
  if (error) return dbError(error);
  return data
    ? Response.json(eventFromRow(data))
    : jsonError("Event not found", 404);
});

// Admins only. Also deletes the event's guests, tables and zones (ON DELETE
// CASCADE).
export const DELETE = withErrorHandling(
  async (_request: Request, ctx: Context) => {
    const denied = await requireAdmin();
    if (denied) return denied;
    const { eventId } = await ctx.params;
    // Works whether or not the event has a user_id; any linked account is
    // left alone (use /api/admin/clients/[id] to delete an account too).
    const { data, error } = await getSupabase()
      .from("events")
      .delete()
      .eq("id", eventId)
      .select("id");
    if (error) return dbError(error);
    return data.length > 0
      ? new Response(null, { status: 204 })
      : jsonError("Event not found", 404);
  },
);
