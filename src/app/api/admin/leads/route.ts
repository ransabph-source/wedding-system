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

// Lists all leads. Admins only. Leads with the soonest follow-up come first;
// those without one come last, newest first.
export const GET = withErrorHandling(async () => {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { data, error } = await getSupabase()
    .from("leads")
    .select("*")
    .order("follow_up_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) return dbError(error);
  return Response.json((data as LeadRow[]).map(leadFromRow));
});

// Creates a lead. Admins only.
// Body: { names, phone?, eventType?, status?, followUpDate?, notes? }
// Responds 201 with the lead.
export const POST = withErrorHandling(async (request: Request) => {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = parseLeadInput(await readJson(request), { partial: false });
  if (typeof parsed === "string") return jsonError(parsed, 400);

  const { data, error } = await getSupabase()
    .from("leads")
    .insert(leadToRow(parsed))
    .select()
    .single<LeadRow>();
  if (error) return dbError(error);
  return Response.json(leadFromRow(data), { status: 201 });
});
