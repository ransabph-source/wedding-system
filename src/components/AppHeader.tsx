"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import AdminModeToggle from "@/components/AdminModeToggle";

interface AppHeaderProps {
  coupleId: string;
  coupleName?: string;
}

export default function AppHeader({ coupleId, coupleName }: AppHeaderProps) {
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <header className="shrink-0 border-b border-amber-100 bg-[#FAF9F6] shadow-sm dark:border-amber-900/30">
      <div className="relative mx-auto flex max-w-6xl items-center justify-center px-4 py-2 sm:px-8">
        <div className="absolute inset-y-0 start-4 flex items-center gap-2 sm:start-8">
          {coupleName && (
            <span className="hidden text-sm font-medium text-zinc-500 sm:inline dark:text-zinc-400">
              {coupleName}
            </span>
          )}
        </div>
        <div className="absolute inset-y-0 end-4 flex items-center gap-4 sm:end-8">
          <AdminModeToggle />
          <Link
            href="/"
            className="text-sm font-medium text-zinc-500 transition hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            יציאה
          </Link>
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
