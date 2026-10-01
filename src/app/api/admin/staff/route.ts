import { getSupabase } from "@/lib/supabase/server";
import { MIN_PASSWORD_LENGTH } from "@/lib/db/clients";
import { listStaff } from "@/lib/db/staff";
import {
  authError,
  jsonError,
  readJson,
  requireAdmin,
  withErrorHandling,
} from "@/lib/db/routeHelpers";
import type { StaffAccount } from "@/types/staff";

const MAX_NAME_LENGTH = 200;

interface CreateStaffBody {
  name: string;
  email: string;
  password: string;
}

function parseBody(body: unknown): CreateStaffBody | string {
  if (typeof body !== "object" || body === null) return "Expected a JSON object";
  const { name, email, password } = body as Record<string, unknown>;
  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.trim().length > MAX_NAME_LENGTH
  ) {
    return `name is required (at most ${MAX_NAME_LENGTH} characters)`;
  }
  if (typeof email !== "string" || !email.includes("@")) {
    return "A valid email is required";
  }
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return `password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  return { name: name.trim(), email: email.trim().toLowerCase(), password };
}

// Lists every staff account. Admins only.
export const GET = withErrorHandling(async () => {
  const denied = await requireAdmin();
  if (denied) return denied;
  return Response.json(await listStaff());
});

// Creates a staff account, who can only use the live check-in screens.
// Admins only. Body: { name, email, password }. Responds 201 with the
// StaffAccount.
//
// If adding the 'staff' profile fails, the Auth user is deleted so a retry
// with the same email works.
export const POST = withErrorHandling(async (request: Request) => {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = parseBody(await readJson(request));
  if (typeof parsed === "string") return jsonError(parsed, 400);

  const supabase = getSupabase();
  const { data: created, error: createError } =
    await supabase.auth.admin.createUser({
      email: parsed.email,
      password: parsed.password,
      // The admin sets the password and hands it over, so skip confirmation.
      email_confirm: true,
      user_metadata: { full_name: parsed.name },
    });
  if (createError) return authError(createError);
  const user = created.user;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .insert({ id: user.id, role: "staff" })
    .select("created_at")
    .single<{ created_at: string }>();
  if (profileError) {
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) console.error("Rollback of auth user failed", user.id, error);
    return jsonError(profileError.message, 500);
  }

  const account: StaffAccount = {
    userId: user.id,
    email: user.email,
    name: parsed.name,
    createdAt: profile.created_at,
    lastSignInAt: null,
  };
  return Response.json(account, { status: 201 });
});
