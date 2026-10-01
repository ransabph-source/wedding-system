import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { areaOf, canOpenArea } from "@/lib/areas";
import type { ProfileRole } from "@/lib/auth";

// Refreshes the Supabase session cookie before every page and route runs,
// sends signed-out visitors on admin, couple and hostess pages to the login
// page, and turns signed-in users away from areas their role can't open (e.g.
// staff from /admin and /couple).
//
// It runs everywhere because the root layout reads the session on every page.
// Server Components can't write cookies, and Supabase refresh tokens are
// single-use, so a token refreshed during rendering would be lost and the
// session left broken. Refreshing here first means rendering never has to.
//
// These are only optimistic checks from the session cookie: the role comes
// from the user_role claim (see supabase/migrations/*_role_claim.sql), which
// can be up to an hour stale and is missing if the hook isn't enabled. The
// pages and API routes verify access against the database themselves.

const ROLES: readonly string[] = ["admin", "staff", "couple"];

function roleClaim(value: unknown): ProfileRole | null {
  return typeof value === "string" && ROLES.includes(value)
    ? (value as ProfileRole)
    : null;
}

export async function proxy(request: NextRequest) {
  const url = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY");
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        // Update the request too, so the page sees the refreshed session.
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
        }
      },
    },
  });

  const { data } = await supabase.auth.getClaims();

  // Keeps any cookie changes, e.g. a refreshed or cleared session.
  function withCookies(other: NextResponse) {
    for (const cookie of response.cookies.getAll()) {
      other.cookies.set(cookie);
    }
    return other;
  }

  const { pathname, search } = request.nextUrl;
  const area = areaOf(pathname);
  if (!area) return response;
  const isApi = pathname.startsWith("/api/");

  if (!data) {
    // API routes answer 401 themselves.
    if (isApi) return response;
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname + search);
    return withCookies(NextResponse.redirect(loginUrl));
  }

  const role = roleClaim(data.claims.user_role);
  if (role && !canOpenArea(role, area)) {
    if (isApi) {
      return withCookies(
        NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      );
    }
    // The home page sends each role to its own landing page.
    return withCookies(NextResponse.redirect(new URL("/", request.url)));
  }

  return response;
}

export const config = {
  // Everything except Next's static files and public images.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
