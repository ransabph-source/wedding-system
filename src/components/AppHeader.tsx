"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import AdminModeToggle from "@/components/AdminModeToggle";

interface AppHeaderProps {
  coupleId: string;
  coupleName?: string;
  // Admins viewing a couple's event get a way back to the admin area.
  showAdminBackLink?: boolean;
}

export default function AppHeader({
  coupleId,
  coupleName,
  showAdminBackLink = false,
}: AppHeaderProps) {
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <header className="shrink-0 border-b border-amber-100 bg-[#FAF9F6] shadow-sm dark:border-amber-900/30">
      <div className="relative mx-auto flex max-w-6xl items-center justify-center px-4 py-2 sm:px-8">
        <div className="absolute inset-y-0 start-4 flex items-center gap-3 sm:start-8">
          {showAdminBackLink && (
            <Link
              href="/admin/dashboard"
              aria-label="חזרה ללוח הבקרה"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-sm font-semibold text-indigo-700 shadow-sm ring-1 ring-black/5 transition hover:bg-indigo-50 active:scale-[0.98] dark:bg-zinc-900 dark:text-indigo-300 dark:hover:bg-zinc-800"
            >
              {/* Points right: "back" in a right-to-left layout. */}
              <svg
                className="h-4 w-4 shrink-0"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M3 10a.75.75 0 0 1 .75-.75h10.638l-3.96-3.71a.75.75 0 1 1 1.024-1.096l5.25 4.92a.75.75 0 0 1 0 1.092l-5.25 4.92a.75.75 0 1 1-1.024-1.096l3.96-3.71H3.75A.75.75 0 0 1 3 10Z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="sm:hidden">חזרה</span>
              <span className="hidden sm:inline">חזרה ללוח הבקרה</span>
            </Link>
          )}
          {coupleName && (
            <span
              className={`hidden text-sm font-medium text-zinc-500 dark:text-zinc-400 ${
                // Leave room for the back button so neither runs into the logo.
                showAdminBackLink ? "lg:inline" : "sm:inline"
              }`}
            >
              {coupleName}
            </span>
          )}
        </div>
        <div className="absolute inset-y-0 end-4 flex items-center gap-4 sm:end-8">
          <AdminModeToggle />
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="text-sm font-medium text-zinc-500 transition hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              יציאה
            </button>
          </form>
        </div>

        <Link
          href={`/couple/${coupleId}`}
          aria-label="מעבר ללוח הבקרה הראשי"
          className="flex items-center rounded-lg transition hover:opacity-80 active:opacity-70"
        >
          {!logoFailed && (
            <Image
              src="/logo.png"
              alt=""
              width={1408}
              height={768}
              priority
              onError={() => setLogoFailed(true)}
              className="h-10 w-auto object-contain sm:h-12"
            />
          )}
        </Link>
      </div>
    </header>
  );
}
