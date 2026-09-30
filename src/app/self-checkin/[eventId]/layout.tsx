import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FAF9F6",
};

export default function SelfCheckInLayout({
  children,
}: LayoutProps<"/self-checkin/[eventId]">) {
  return children;
}
