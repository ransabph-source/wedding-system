import { getSupabase } from "@/lib/supabase/server";
import { isStaffAccount } from "@/lib/db/staff";
import {
  authError,
  jsonError,
  requireAdmin,
  withErrorHandling,
} from "@/lib/db/routeHelpers";

type Context = RouteContext<"/api/admin/staff/[id]">;

// Deletes a staff account. Admins only. Responds 204.
//
// Deleting the Auth user cascades to the profile and revokes their refresh
// tokens, so they're signed out within the access token's lifetime.
export const DELETE = withErrorHandling(
  async (_request: Request, ctx: Context) => {
    const denied = await requireAdmin();
    if (denied) return denied;

    const { id } = await ctx.params;
    if (!(await isStaffAccount(id))) {
      return jsonError("Staff member not found", 404);
    }

    const { error } = await getSupabase().auth.admin.deleteUser(id);
    if (error) return authError(error);

    return new Response(null, { status: 204 });
  },
);
