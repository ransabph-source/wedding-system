import { getSupabase } from "@/lib/supabase/server";
import { eventFromRow, eventToRow, type EventRow } from "@/lib/db/mappers";
import { listClients, MIN_PASSWORD_LENGTH } from "@/lib/db/clients";
import {
  authError,
  jsonError,
  readJson,
  requireAdmin,
  withErrorHandling,
} from "@/lib/db/routeHelpers";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

interface CreateClientBody {
  coupleNames: string;
  email: string;
  password: string;
  eventDate: string;
  venue: string;
  phone: string;
}

const MAX_PHONE_LENGTH = 200;

function parseBody(body: unknown): CreateClientBody | string {
  if (typeof body !== "object" || body === null) return "Expected a JSON object";
  const { coupleNames, email, password, eventDate, venue, phone } = body as Record<
    string,
    unknown
  >;
  if (typeof coupleNames !== "string" || !coupleNames.trim()) {
    return "coupleNames is required";
  }
  if (typeof email !== "string" || !email.includes("@")) {
    return "A valid email is required";
  }
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return `password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  if (typeof eventDate !== "string" || !DATE_PATTERN.test(eventDate)) {
    return "eventDate must be YYYY-MM-DD";
  }
  if (typeof venue !== "string" || !venue.trim()) return "venue is required";
  if (
    phone !== undefined &&
    (typeof phone !== "string" || phone.trim().length > MAX_PHONE_LENGTH)
  ) {
    return `phone must be a string of at most ${MAX_PHONE_LENGTH} characters`;
  }
  return {
    coupleNames: coupleNames.trim(),
    email: email.trim().toLowerCase(),
    password,
    eventDate,
    venue: venue.trim(),
    phone: typeof phone === "string" ? phone.trim() : "",
  };
}

// Lists every couple account with its email and events. Admins only.
export const GET = withErrorHandling(async () => {
  const denied = await requireAdmin();
  if (denied) return denied;
  return Response.json(await listClients());
});

// Creates a couple's account and their first event. Admins only.
// Body: { coupleNames, email, password, eventDate, venue, phone? }
// Responds 201 with { userId, event }.
//
// Steps run in order: Auth user → 'couple' profile → event. If a later step
// fails, the Auth user is deleted (which cascades to the profile) so a retry
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
      user_metadata: { couple_names: parsed.coupleNames },
    });
  if (createError) return authError(createError);
  const userId = created.user.id;

  const rollback = async (message: string) => {
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) console.error("Rollback of auth user failed", userId, error);
    return jsonError(message, 500);
  };

  const { error: profileError } = await supabase
    .from("profiles")
    .insert({ id: userId, role: "couple" });
  if (profileError) return rollback(profileError.message);

  const { data: eventRow, error: eventError } = await supabase
    .from("events")
    .insert({
      ...eventToRow({
        coupleNames: parsed.coupleNames,
        eventDate: parsed.eventDate,
        venue: parsed.venue,
        phone: parsed.phone,
      }),
      user_id: userId,
    })
    .select()
    .single<EventRow>();
  if (eventError) return rollback(eventError.message);

  return Response.json(
    { userId, event: eventFromRow(eventRow) },
    { status: 201 },
  );
});
