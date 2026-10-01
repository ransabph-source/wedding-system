import AdminModeBanner from "@/components/AdminModeBanner";
import AppHeader from "@/components/AppHeader";
import { redirect } from "next/navigation";
import { canAccessEvent, getCurrentUser } from "@/lib/auth";
import { getEvent } from "@/lib/db/events";

export default async function CoupleLayout({
  children,
  params,
}: LayoutProps<"/couple/[id]">) {
  const { id } = await params;
  // Admins and the couple who owns the event only. The login page sends
  // anyone else (signed in or not) to their own home page.
  if (!(await canAccessEvent(await getCurrentUser(), id, "edit"))) {
    redirect("/login");
  }

  // The header still renders if the database is unreachable; the page
  // itself shows the load error.
  const event = await getEvent(id).catch(() => null);

  return (
    <div className="flex min-h-screen flex-col">
      <AdminModeBanner />
      <AppHeader coupleId={id} coupleName={event?.coupleNames} />
      {children}
    </div>
  );
}
