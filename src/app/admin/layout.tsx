import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AdminNav from "./AdminNav";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  // src/proxy.ts already redirects signed-out visitors; this also catches
  // signed-in users who aren't admins.
  const user = await getCurrentUser();
  if (user?.role !== "admin") redirect("/login");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-1.5 sm:px-6 md:py-2">
          <span className="truncate text-base font-bold text-zinc-900 dark:text-zinc-50">
            CRM - הנהלה
          </span>
          <AdminNav email={user.email ?? null} />
        </div>
      </header>
      <div className="flex-1 bg-zinc-100 dark:bg-zinc-950">{children}</div>
    </div>
  );
}
