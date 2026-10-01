import { redirect } from "next/navigation";

// The original guest check-in URL. Kept so printed QR codes still work.
export default async function QrCheckInRedirect({
  params,
}: PageProps<"/qr/[eventId]">) {
  const { eventId } = await params;
  redirect(`/self-checkin/${encodeURIComponent(eventId)}`);
}
