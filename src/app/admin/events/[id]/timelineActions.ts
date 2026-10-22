"use server";

import { getCurrentUser } from "@/lib/auth";
import { getEvent } from "@/lib/db/events";
import { campaignSchedule, type CampaignSchedule } from "@/lib/rsvpSchedule";

// The RSVP automation timeline the admin event page shows (see
// lib/rsvpSchedule). Worked out on the server, where the Jewish calendar
// lives, from the event date saved in the database.

export type AutomationTimelineResult =
  | { ok: true; eventDate: string; schedule: CampaignSchedule }
  | { ok: false; reason: "unauthorized" | "not_found" };

export async function getAutomationTimeline(
  eventId: string,
): Promise<AutomationTimelineResult> {
  // Server actions can be called directly by anyone signed in.
  const user = await getCurrentUser();
  if (user?.role !== "admin") return { ok: false, reason: "unauthorized" };

  const event = await getEvent(eventId);
  if (!event) return { ok: false, reason: "not_found" };
  return {
    ok: true,
    eventDate: event.eventDate,
    schedule: campaignSchedule(event.eventDate),
  };
}
