import type { Viewport } from "next";
import { Frank_Ruhl_Libre } from "next/font/google";

// A classic Hebrew serif for the invitation's headings.
const invitationSerif = Frank_Ruhl_Libre({
  variable: "--font-invitation-serif",
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "700"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FAF7F0",
};

export default function RsvpLayout({ children }: LayoutProps<"/rsvp/[token]">) {
  return <div className={invitationSerif.variable}>{children}</div>;
}
