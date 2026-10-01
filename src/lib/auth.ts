import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { areaOf, canOpenArea } from "@/lib/areas";
import { createAuthClient } from "@/lib/supabase/auth";
import { getSupabase } from "@/lib/supabase/server";

export type ProfileRole = "admin" | "staff" | "couple";

export interface CurrentUser {
  id: string;
  email: string | undefined;
  // Null if the Auth user has no profile row.
  role: ProfileRole | null;
}

export async function getRole(userId: string): Promise<ProfileRole | null> {
  const { data, error } = await getSupabase()
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle<{ role: ProfileRole }>();
  if (error) throw error;
  return data?.role ?? null;
}

// The signed-in user, verified against Supabase Auth, or null. Memoized per
// request so a layout and its page share one lookup.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createAuthClient();
  const { data } = await supabase.auth.getClaims();
  if (!data) return null;
  const { sub, email } = data.claims;
  return { id: sub, email, role: await getRole(sub) };
});

export async function isAdmin() {
  const user = await getCurrentUser();
  return user?.role === "admin";
}

// A ?next= value the user may be sent back to after login: only the admin
// and live areas, and only if their role may open it. Being a local path, it
// can't point at another site. Couples always go to their own event.
// Without a role, says whether the path could be valid for someone, so the
// login page can pass it on before knowing who signs in.
export function loginNextPath(
  next: unknown,
  role?: ProfileRole | null,
): string | null {
  if (typeof next !== "string") return null;
  const area = areaOf(next);
  if (area !== "/admin" && area !== "/live") return null;
  if (role === undefined) return next;
  return canOpenArea(role, area) ? next : null;
}

// Where a signed-in user lands, or why they have nowhere to go.
export type HomeResult =
  | { ok: true; path: string }
  | { ok: false; reason: "no_role" | "no_event" };

// Shown on the login page when a signed-in user has nowhere to go.
export const NO_HOME_MESSAGES: Record<
  Extract<HomeResult, { ok: false }>["reason"],
  string
> = {
  no_event:
    "הפרטים נכונים, אך לא נמצא אירוע המשויך לחשבון זה. פנו למנהל המערכת.",
  no_role: "לחשבון זה לא הוגדרו הרשאות. פנו למנהל המערכת.",
};

// Matches the session cookie and its chunks (".0", ".1", ...) and the PKCE
// code verifier that @supabase/ssr stores.
const AUTH_COOKIE_PATTERN = /^sb-.+-auth-token(?:\.\d+|-code-verifier)?$/;

// Revokes the session with Supabase and deletes its cookies. Call it only
// where cookies can be written (Route Handlers and Server Actions).
export async function destroySession() {
  const supabase = await createAuthClient();
  // Revokes the refresh token and removes the session cookies. It removes
  // them even if the request to Supabase fails.
  const { error } = await supabase.auth.signOut();
  if (error) console.error("Supabase sign-out failed", error);

  // Also delete any auth cookie signOut() didn't know about, e.g. a leftover
  // chunk from an earlier, larger session.
  const cookieStore = await cookies();
  for (const { name } of cookieStore.getAll()) {
    if (AUTH_COOKIE_PATTERN.test(name)) cookieStore.delete(name);
  }
}

export async function getHomePath(
  userId: string,
  role: ProfileRole | null,
): Promise<HomeResult> {
  switch (role) {
    case "admin":
      return { ok: true, path: "/admin/dashboard" };
    case "staff":
      return { ok: true, path: "/live" };
    case "couple": {
      // A couple normally has one event; if there are several, use the newest.
      const { data, error } = await getSupabase()
        .from("events")
        .select("id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<{ id: string }>();
      if (error) throw error;
      return data
        ? { ok: true, path: `/couple/${encodeURIComponent(data.id)}` }
        : { ok: false, reason: "no_event" };
    }
    default:
      return { ok: false, reason: "no_role" };
  }
}

// "view" covers reading an event and its guests, tables and zones; "edit"
// covers changing them. Staff may view any event but only edit guests'
// arrival, which the guests route handles separately.
export type EventAccess = "view" | "edit";

export async function canAccessEvent(
  user: CurrentUser | null,
  eventId: string,
  access: EventAccess,
): Promise<boolean> {
  switch (user?.role) {
    case "admin":
      return true;
    case "staff":
      return access === "view";
    case "couple": {
      const { data, error } = await getSupabase()
        .from("events")
        .select("user_id")
        .eq("id", eventId)
        .maybeSingle<{ user_id: string | null }>();
      if (error) throw error;
      return data?.user_id === user.id;
    }
    default:
      return false;
  }
}
