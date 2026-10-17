import OpenAI from "openai";
import { getSupabase } from "@/lib/supabase/server";
import {
  buildSeatingSnapshot,
  isOpenAIConfigured,
  requestSeatingPlan,
} from "@/lib/aiSeatingModel";
import {
  guestFromRow,
  tableFromRow,
  zoneFromRow,
  type GuestRow,
  type SeatingTableRow,
  type SeatingZoneRow,
} from "@/lib/db/mappers";
import {
  authorizeEvent,
  checkCouplePhase,
  dbError,
  jsonError,
  readJson,
  withErrorHandling,
} from "@/lib/db/routeHelpers";
import {
  AI_SEATING_PROMPT_MAX_LENGTH,
  AI_SEATING_USAGE_LIMIT,
  type AiSeatingResult,
  type AiSeatingStatus,
} from "@/types/aiSeating";

// Seconds. Planning a large event can take minutes (see aiSeatingModel).
export const maxDuration = 300;

interface AiSeatingEventRow {
  ai_usage_count: number;
  is_seating_locked: boolean;
}

async function getStatus(eventId: string): Promise<AiSeatingStatus | null> {
  const { data, error } = await getSupabase()
    .from("events")
    .select("ai_usage_count, is_seating_locked")
    .eq("id", eventId)
    .maybeSingle<AiSeatingEventRow>();
  if (error) throw error;
  return data
    ? {
        usageCount: data.ai_usage_count,
        usageLimit: AI_SEATING_USAGE_LIMIT,
        isLocked: data.is_seating_locked,
      }
    : null;
}

async function loadCollection<Row>(table: string, eventId: string) {
  const { data, error } = await getSupabase()
    .from(table)
    .select("*")
    .eq("event_id", eventId)
    .order("seq");
  if (error) throw error;
  return data as Row[];
}

// GET /api/ai-seating?eventId=... → the event's AI usage and lock state.
export const GET = withErrorHandling(async (request: Request) => {
  const eventId = new URL(request.url).searchParams.get("eventId");
  if (!eventId) return jsonError("Missing eventId", 400);
  const auth = await authorizeEvent(eventId, "edit");
  if (auth instanceof Response) return auth;
  const status = await getStatus(eventId);
  return status ? Response.json(status) : jsonError("Event not found", 404);
});

// PUT /api/ai-seating { eventId, isLocked } → locks or unlocks the assistant.
// Only the event's couple and admins ("edit" access) may change it.
export const PUT = withErrorHandling(async (request: Request) => {
  const body = (await readJson(request)) as
    | { eventId?: unknown; isLocked?: unknown }
    | undefined;
  if (typeof body?.eventId !== "string" || typeof body.isLocked !== "boolean") {
    return jsonError("Expected { eventId: string, isLocked: boolean }", 400);
  }
  const auth = await authorizeEvent(body.eventId, "edit");
  if (auth instanceof Response) return auth;
  const { data, error } = await getSupabase()
    .from("events")
    .update({ is_seating_locked: body.isLocked })
    .eq("id", body.eventId)
    .select("ai_usage_count, is_seating_locked")
    .maybeSingle<AiSeatingEventRow>();
  if (error) return dbError(error);
  if (!data) return jsonError("Event not found", 404);
  return Response.json({
    usageCount: data.ai_usage_count,
    usageLimit: AI_SEATING_USAGE_LIMIT,
    isLocked: data.is_seating_locked,
  } satisfies AiSeatingStatus);
});

// POST /api/ai-seating { eventId, prompt } → new tables for guests, as
// { assignments: [{ guestId, tableId }], ... }. Nothing is saved here; the
// client applies the assignments through its usual guest saves.
// 403 when seating is locked, 429 once the event used its quota.
export const POST = withErrorHandling(async (request: Request) => {
  const body = (await readJson(request)) as
    | { eventId?: unknown; prompt?: unknown }
    | undefined;
  if (typeof body?.eventId !== "string" || typeof body.prompt !== "string") {
    return jsonError("Expected { eventId: string, prompt: string }", 400);
  }
  const { eventId } = body;
  const prompt = body.prompt.trim();
  if (!prompt) return jsonError("The prompt is empty", 400);
  if (prompt.length > AI_SEATING_PROMPT_MAX_LENGTH) {
    return jsonError(
      `The prompt is longer than ${AI_SEATING_PROMPT_MAX_LENGTH} characters`,
      400,
    );
  }

  const auth = await authorizeEvent(eventId, "edit");
  if (auth instanceof Response) return auth;
  if (auth.role === "couple") {
    const locked = await checkCouplePhase(eventId, ["seating"]);
    if (locked) return locked;
  }
  // Checked before claiming a request, so a missing key doesn't use quota.
  if (!isOpenAIConfigured()) {
    return jsonError("The AI assistant isn't configured", 503);
  }

  const [guestRows, tableRows, zoneRows] = await Promise.all([
    loadCollection<GuestRow>("guests", eventId),
    loadCollection<SeatingTableRow>("seating_tables", eventId),
    loadCollection<SeatingZoneRow>("seating_zones", eventId),
  ]);
  const snapshot = buildSeatingSnapshot(
    guestRows.map(guestFromRow),
    tableRows.map(tableFromRow),
    zoneRows.map(zoneFromRow),
  );
  if (snapshot.tables.length === 0) {
    return jsonError("There are no tables the assistant can seat guests at", 409);
  }
  if (snapshot.guests.length === 0) {
    return jsonError("There are no confirmed guests to seat", 409);
  }

  // Checks the lock and the quota and counts this request in one statement.
  const { data: usageCount, error } = await getSupabase().rpc(
    "claim_ai_seating_request",
    { target_event_id: eventId, usage_limit: AI_SEATING_USAGE_LIMIT },
  );
  if (error) return dbError(error);
  if (typeof usageCount !== "number") {
    const status = await getStatus(eventId);
    if (!status) return jsonError("Event not found", 404);
    if (status.isLocked) return jsonError("Seating is locked", 403);
    return jsonError(
      `This event used all ${AI_SEATING_USAGE_LIMIT} AI requests`,
      429,
    );
  }

  let result;
  try {
    result = await requestSeatingPlan(prompt, snapshot);
  } catch (error) {
    if (!(error instanceof OpenAI.APIError)) throw error;
    console.error("OpenAI request failed", error);
    return jsonError("The AI service is unavailable, try again later", 502);
  }

  if (!result.ok) {
    const messages = {
      off_topic: ["The request isn't about event seating", 422],
      bad_output: ["The AI returned an answer that couldn't be used", 502],
      truncated: ["The AI's answer was too long; try a narrower request", 502],
    } as const;
    const [message, status] = messages[result.reason];
    return jsonError(message, status);
  }

  return Response.json({
    assignments: result.assignments,
    ignoredCount: result.ignoredCount,
    usageCount,
    usageLimit: AI_SEATING_USAGE_LIMIT,
    isLocked: false,
  } satisfies AiSeatingResult);
});
