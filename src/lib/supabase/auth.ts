import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function getAuthConfig() {
  const url = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY. Add them to .env.local and restart the dev server.",
    );
  }
  return { url, publishableKey };
}

// A per-request client that reads and writes the signed-in user's session
// cookies. It uses the publishable key, so it only acts as that user; use
// getSupabase() from ./server for data access.
export async function createAuthClient() {
  // Read cookies first: it marks the route as dynamic, so the build never
  // tries to prerender it (and doesn't need the env vars).
  const cookieStore = await cookies();
  const { url, publishableKey } = getAuthConfig();
  return createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components can't set cookies. src/proxy.ts refreshes the
          // session before they render, so this is safe to ignore.
        }
      },
    },
  });
}
