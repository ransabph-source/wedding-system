import AdminModeBanner from "@/components/AdminModeBanner";
import AppHeader from "@/components/AppHeader";
import { getEventById } from "@/lib/mockEvents";

export default async function CoupleLayout({
  children,
  params,
}: LayoutProps<"/couple/[id]">) {
  const { id } = await params;
  const event = getEventById(id);

  return (
    <div className="flex min-h-screen flex-col">
      <AdminModeBanner />
      <AppHeader coupleId={id} coupleName={event?.coupleNames} />
      {children}
    </div>
  );
}
