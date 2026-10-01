import type { Viewport } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function LiveLayout({
  children,
}: LayoutProps<"/live/[id]">) {
  // The hostess screen is for staff and admins.
  const user = await getCurrentUser();
  if (user?.role !== "staff" && user?.role !== "admin") redirect("/login");
  return children;
}
