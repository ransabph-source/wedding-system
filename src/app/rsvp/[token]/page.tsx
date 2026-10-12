import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findGuestByRsvpToken } from "@/lib/db/rsvp";
import { isGuestRsvpOpen } from "@/lib/eventPhaseRules";
import { getConfirmedCount } from "@/lib/guestRsvp";
import RsvpInvitation from "./RsvpInvitation";

// Metadata and the page both need the guest; this looks them up once.
const loadInvitation = cache(findGuestByRsvpToken);

export async function generateMetadata({
  params,
}: PageProps<"/rsvp/[token]">): Promise<Metadata> {
  const { token } = await params;
  const found = await loadInvitation(token);
  return {
    title: found ? `הזמנה · ${found.event.coupleNames}` : "הזמנה",
    // Each link is private to one guest.
    robots: { index: false, follow: false },
  };
}

// Public: each guest gets their own link, which only shows and changes that
// guest's own RSVP.
export default async function RsvpPage({
  params,
}: PageProps<"/rsvp/[token]">) {
  const { token } = await params;
  const found = await loadInvitation(token);
  if (!found) notFound();
  const { guest, event } = found;

  return (
    <RsvpInvitation
      token={token}
      event={{
        coupleNames: event.coupleNames,
        eventDate: event.eventDate,
        venue: event.venue,
      }}
      guest={{
        name: guest.name,
        partySize: Math.max(1, guest.partySize),
        answer:
          guest.rsvpStatus === "confirmed"
            ? { attending: true, count: Math.max(1, getConfirmedCount(guest)) }
            : guest.rsvpStatus === "declined"
              ? { attending: false }
              : null,
      }}
      isOpen={isGuestRsvpOpen(event.phase)}
    />
  );
}
