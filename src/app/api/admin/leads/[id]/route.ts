import { getSupabase } from "@/lib/supabase/server";
import { parseLeadInput } from "@/lib/db/leads";
import { leadFromRow, leadToRow, type LeadRow } from "@/lib/db/mappers";
import {
  dbError,
  jsonError,
  readJson,
  requireAdmin,
  withErrorHandling,
} from "@/lib/db/routeHelpers";

type Context = RouteContext<"/api/admin/leads/[id]">;

// Updates only the fields sent, e.g. { status: "contacted" }. Admins only.
// Responds with the updated lead.
export const PUT = withErrorHandling(async (request: Request, ctx: Context) => {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await ctx.params;
  const parsed = parseLeadInput(await readJson(request), { partial: true });
  if (typeof parsed === "string") return jsonError(parsed, 400);
  const updates = leadToRow(parsed);
  if (Object.keys(updates).length === 0) {
    return jsonError("No fields to update", 400);
  }

  const { data, error } = await getSupabase()
    .from("leads")
    .update(updates)
    .eq("id", id)
    .select()
    .maybeSingle<LeadRow>();
  if (error) return dbError(error);
  return data
    ? Response.json(leadFromRow(data))
    : jsonError("Lead not found", 404);
});

// Deletes a lead. Admins only. Responds 204, or 404 if there was none.
export const DELETE = withErrorHandling(
  async (_request: Request, ctx: Context) => {
    const denied = await requireAdmin();
    if (denied) return denied;

    const { id } = await ctx.params;
    const { data, error } = await getSupabase()
      .from("leads")
      .delete()
      .eq("id", id)
      .select("id");
    if (error) return dbError(error);
    return data.length > 0
      ? new Response(null, { status: 204 })
      : jsonError("Lead not found", 404);
  },
);
