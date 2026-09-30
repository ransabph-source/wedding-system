import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function LiveLayout({ children }: LayoutProps<"/live/[id]">) {
  return children;
}
