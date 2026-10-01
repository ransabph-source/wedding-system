import { getCurrentUser } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase/server";
import { eventFromRow, eventToRow, type EventRow } from "@/lib/db/mappers";
import {
  dbError,
  jsonError,
  readJson,
  requireAdmin,
  withErrorHandling,
} from "@/lib/db/routeHelpers";
import type { EventRecord } from "@/types/event";

// Admins and staff get every event; a couple gets only their own.
export const GET = withErrorHandling(async () => {
  const user = await getCurrentUser();
  if (!user) return jsonError("Not signed in", 401);
  if (!user.role) return jsonError("You don't have access to events", 403);

  let query = getSupabase().from("events").select("*").order("event_date");
  if (user.role === "couple") query = query.eq("user_id", user.id);
  const { data, error } = await query;
  if (error) return dbError(error);
  return Response.json((data as EventRow[]).map(eventFromRow));
});

// Admins only. Couples' events are created with their account through
// /api/admin/clients.
// Body: { coupleNames, eventDate, venue?, guestsInvited?, status?, phase?, id? }
export const POST = withErrorHandling(async (request: Request) => {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = await readJson(request);
  if (typeof body !== "object" || body === null) {
    return jsonError("Expected an event object", 400);
  }
  const { data, error } = await getSupabase()
    .from("events")
    .insert(eventToRow(body as Partial<EventRecord>))
    .select()
    .single<EventRow>();
  if (error) return dbError(error);
  return Response.json(eventFromRow(data), { status: 201 });
});
