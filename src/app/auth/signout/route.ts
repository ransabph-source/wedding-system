import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

// Sign-out buttons POST here as a plain form, so the browser does a full page
// load to /login: the client-side router cache and in-memory event data from
// the signed-out session are discarded rather than reused.
//
// POST only, so a prefetch or a link can't sign anyone out.
export async function POST(request: Request) {
  await destroySession();
  // 303 turns the POST into a GET of /login.
  const response = NextResponse.redirect(new URL("/login", request.url), 303);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
