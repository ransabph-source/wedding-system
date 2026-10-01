import { getSupabase } from "@/lib/supabase/server";
import { MIN_PASSWORD_LENGTH } from "@/lib/db/clients";
import { isStaffAccount } from "@/lib/db/staff";
import {
  authError,
  jsonError,
  readJson,
  requireAdmin,
  withErrorHandling,
} from "@/lib/db/routeHelpers";

type Context = RouteContext<"/api/admin/staff/[id]/password">;

// Sets a new password for a staff account. Admins only.
// Body: { password }. Responds 204.
export const PUT = withErrorHandling(async (request: Request, ctx: Context) => {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await ctx.params;
  const body = (await readJson(request)) as { password?: unknown } | undefined;
  const password = body?.password;
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return jsonError(
      `password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      400,
    );
  }

  if (!(await isStaffAccount(id))) {
    return jsonError("Staff member not found", 404);
  }

  const { error } = await getSupabase().auth.admin.updateUserById(id, {
    password,
  });
  if (error) return authError(error);

  return new Response(null, { status: 204 });
});
