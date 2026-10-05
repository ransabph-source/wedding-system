import { getEvent } from "@/lib/db/events";
import {
  authorizeEvent,
  checkCouplePhase,
  jsonError,
  withErrorHandling,
} from "@/lib/db/routeHelpers";
import { getSupabase } from "@/lib/supabase/server";

// The event's hall floor plan image, kept in the private "floor-plans"
// storage bucket (see supabase/migrations/20261006000000_floor_plans.sql).
//   GET    → { url } — a short-lived signed URL, or null if none was uploaded
//   PUT    → replace the image (body: the raw image file) → { url }
//   DELETE → remove the image
// Anyone who can view the event may see it, including hostesses on the live
// screen; changing it needs edit access, and couples only while seating is
// editable in the event's phase.

type Context = RouteContext<"/api/events/[eventId]/floor-plan">;

const BUCKET = "floor-plans";
const SIGNED_URL_TTL_SECONDS = 60 * 60;
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

function storage() {
  return getSupabase().storage.from(BUCKET);
}

// Event IDs become storage paths, so only plain IDs are accepted.
function floorPlanPath(eventId: string): string | null {
  return /^[A-Za-z0-9_-]+$/.test(eventId) ? eventId : null;
}

async function signedUrl(path: string): Promise<string> {
  const { data, error } = await storage().createSignedUrl(
    path,
    SIGNED_URL_TTL_SECONDS,
  );
  if (error) throw error;
  return data.signedUrl;
}

// Edit access, plus the couple's phase lock for seating.
async function authorizeChange(eventId: string): Promise<Response | null> {
  const auth = await authorizeEvent(eventId, "edit");
  if (auth instanceof Response) return auth;
  if (auth.role === "couple") return checkCouplePhase(eventId, ["seating"]);
  return (await getEvent(eventId)) ? null : jsonError("Event not found", 404);
}

export const GET = withErrorHandling(async (_request: Request, ctx: Context) => {
  const { eventId } = await ctx.params;
  const auth = await authorizeEvent(eventId, "view");
  if (auth instanceof Response) return auth;
  const path = floorPlanPath(eventId);
  if (!path) return jsonError("Event not found", 404);

  // exists() is a HEAD request, so a missing object or bucket comes back as a
  // bare 400/404 with no detail. Either way there's no plan to show, which is
  // a normal state rather than a failure; log it in case it's a real fault.
  const { data: exists, error } = await storage().exists(path);
  if (error) console.warn(`Floor plan lookup for ${eventId}:`, error.message);
  return Response.json({ url: exists ? await signedUrl(path) : null });
});

export const PUT = withErrorHandling(async (request: Request, ctx: Context) => {
  const { eventId } = await ctx.params;
  const denied = await authorizeChange(eventId);
  if (denied) return denied;
  const path = floorPlanPath(eventId);
  if (!path) return jsonError("Event not found", 404);

  const contentType = request.headers.get("content-type") ?? "";
  if (!ALLOWED_TYPES.has(contentType)) {
    return jsonError("The floor plan must be a PNG, JPEG, WebP or GIF image", 400);
  }
  const declaredLength = Number(request.headers.get("content-length"));
  if (declaredLength > MAX_BYTES) {
    return jsonError("The floor plan image must be 10 MB or smaller", 413);
  }
  const body = await request.arrayBuffer();
  if (body.byteLength === 0) return jsonError("The image is empty", 400);
  if (body.byteLength > MAX_BYTES) {
    return jsonError("The floor plan image must be 10 MB or smaller", 413);
  }

  const { error } = await storage().upload(path, body, {
    contentType,
    upsert: true,
    // Replacing the image keeps its path, so don't let caches hold it long.
    cacheControl: "60",
  });
  if (error) throw error;
  return Response.json({ url: await signedUrl(path) });
});

export const DELETE = withErrorHandling(
  async (_request: Request, ctx: Context) => {
    const { eventId } = await ctx.params;
    const denied = await authorizeChange(eventId);
    if (denied) return denied;
    const path = floorPlanPath(eventId);
    if (!path) return jsonError("Event not found", 404);

    const { error } = await storage().remove([path]);
    if (error) throw error;
    return new Response(null, { status: 204 });
  },
);
