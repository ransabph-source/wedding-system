import { notFound } from "next/navigation";
import { getEvent } from "@/lib/db/events";
import SelfCheckIn from "./SelfCheckIn";

// Public: guests reach this page by scanning the event's QR code. Check-in
// only works while the event is LIVE.
export default async function SelfCheckInPage({
  params,
}: PageProps<"/self-checkin/[eventId]">) {
  const { eventId } = await params;
  const event = await getEvent(eventId);
  if (!event) notFound();

  return (
    <SelfCheckIn
      eventId={eventId}
      event={{
        coupleNames: event.coupleNames,
        eventDate: event.eventDate,
        venue: event.venue,
      }}
      isOpen={event.phase === "LIVE"}
    />
  );
}
