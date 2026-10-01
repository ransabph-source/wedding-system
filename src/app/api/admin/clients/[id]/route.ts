import { getSupabase } from "@/lib/supabase/server";
import { isCoupleAccount } from "@/lib/db/clients";
import {
  authError,
  dbError,
  jsonError,
  requireAdmin,
  withErrorHandling,
} from "@/lib/db/routeHelpers";

type Context = RouteContext<"/api/admin/clients/[id]">;

// Deletes a couple's account and their events. Admins only.
// Responds 204.
//
// events.user_id is ON DELETE SET NULL, so the events are deleted explicitly
// (cascading to their guests, tables and zones). They go first: if deleting
// the Auth user then fails, the account is still listed and a retry finishes
// the job. Deleting the Auth user cascades to the profile.
export const DELETE = withErrorHandling(
  async (_request: Request, ctx: Context) => {
    const denied = await requireAdmin();
    if (denied) return denied;

    const { id } = await ctx.params;
    if (!(await isCoupleAccount(id))) {
      return jsonError("Client not found", 404);
    }

    const supabase = getSupabase();
    const { error: eventsError } = await supabase
      .from("events")
      .delete()
      .eq("user_id", id);
    if (eventsError) return dbError(eventsError);

    const { error: deleteError } = await supabase.auth.admin.deleteUser(id);
    if (deleteError) return authError(deleteError);

    return new Response(null, { status: 204 });
  },
);
