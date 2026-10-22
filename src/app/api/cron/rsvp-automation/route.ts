import { createHash, timingSafeEqual } from "node:crypto";
import { israelDate, runRsvpAutomation } from "@/lib/rsvpAutomation";
import { isRestDay } from "@/lib/restDays";

// Daily RSVP automation (see lib/rsvpAutomation), scheduled in vercel.json.
// Vercel Cron calls this with "Authorization: Bearer <CRON_SECRET>"; anything
// else is turned away, so the messages can't be triggered from outside.

// Sending a day's messages can take a while.
export const maxDuration = 300;

// Hashed first so the comparison takes the same time whatever the length.
function isAuthorized(header: string | null, secret: string): boolean {
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(header ?? ""), digest(`Bearer ${secret}`));
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    console.error("CRON_SECRET is not set; rejecting cron call");
    return Response.json({ error: "Not configured" }, { status: 503 });
  }
  if (!isAuthorized(request.headers.get("authorization"), secret)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Nothing runs on rest days (Fridays, Saturdays, holidays and their eves,
  // Yom HaShoah, Yom HaZikaron): no guest messages and no admin reports.
  // Each event's timeline pauses over them and resumes on the next working
  // day, so no message or call day is lost.
  const today = israelDate(new Date());
  if (isRestDay(today)) {
    console.log("Rest day - skipping execution");
    return Response.json({ status: "rest_day", date: today });
  }

  try {
    return Response.json(await runRsvpAutomation());
  } catch (error) {
    console.error("RSVP automation failed", error);
    return Response.json({ error: "Automation failed" }, { status: 500 });
  }
}
