import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  // src/proxy.ts already redirects signed-out visitors; this also catches
  // signed-in users who aren't admins.
  const user = await getCurrentUser();
  if (user?.role !== "admin") redirect("/login");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5 sm:px-6">
          <span className="text-base font-bold text-zinc-900 dark:text-zinc-50">
            CRM - הנהלה
          </span>
          <nav className="flex items-center gap-4">
            <Link
              href="/admin"
              className="text-sm font-medium text-zinc-500 transition hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              לידים ואירועים
            </Link>
            <Link
              href="/admin/dashboard"
              className="text-sm font-medium text-zinc-500 transition hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              לקוח חדש
            </Link>
            <Link
              href="/admin/staff"
              className="text-sm font-medium text-zinc-500 transition hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              צוות
            </Link>
            <Link
              href="/live"
              className="text-sm font-medium text-zinc-500 transition hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              מסך דיילות
            </Link>
            <form action="/auth/signout" method="post" className="flex items-center gap-2">
              <span
                dir="ltr"
                className="hidden text-xs text-zinc-400 sm:inline dark:text-zinc-500"
              >
                {user.email}
              </span>
              <button
                type="submit"
                className="text-sm font-medium text-zinc-500 transition hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                יציאה
              </button>
            </form>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
