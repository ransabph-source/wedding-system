"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "לידים ואירועים" },
  { href: "/admin/dashboard", label: "לקוח חדש" },
  { href: "/admin/staff", label: "צוות" },
  { href: "/live", label: "מסך דיילות" },
] as const;

// Inline links from md up; a toggled drop-down panel below that, so the
// header never overflows on phones.
export default function AdminNav({ email }: { email: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Close the mobile menu after navigating. Adjusting state during render
  // (rather than in an effect) avoids a frame with the stale menu open.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  function linkClasses(href: string, mobile: boolean) {
    const active = pathname === href;
    const base = mobile
      ? "flex min-h-11 items-center rounded-lg px-3 text-base font-medium transition"
      : "rounded-lg px-2.5 py-1.5 text-sm font-medium transition";
    return `${base} ${
      active
        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
        : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
    }`;
  }

  const signOut = (mobile: boolean) => (
    <form
      action="/auth/signout"
      method="post"
      className={
        mobile
          ? "mt-1 flex flex-col gap-1 border-t border-zinc-100 pt-2 dark:border-zinc-800"
          : "flex items-center gap-2"
      }
    >
      {email && (
        <span
          dir="ltr"
          className={
            mobile
              ? "truncate px-3 text-start text-xs text-zinc-400 dark:text-zinc-500"
              : "hidden text-xs text-zinc-400 lg:inline dark:text-zinc-500"
          }
        >
          {email}
        </span>
      )}
      <button
        type="submit"
        className={
          mobile
            ? "flex min-h-11 items-center rounded-lg px-3 text-base font-medium text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
            : "rounded-lg px-2.5 py-1.5 text-sm font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        }
      >
        יציאה
      </button>
    </form>
  );

  return (
    <>
      <nav className="hidden items-center gap-1 md:flex">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={linkClasses(link.href, false)}
          >
            {link.label}
          </Link>
        ))}
        {signOut(false)}
      </nav>

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls="admin-mobile-nav"
        aria-label={open ? "סגירת התפריט" : "פתיחת התפריט"}
        className="grid h-11 w-11 place-items-center rounded-lg text-zinc-600 transition hover:bg-zinc-100 md:hidden dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        <svg
          className="h-6 w-6"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          aria-hidden="true"
        >
          {open ? (
            <path d="M6 6l12 12M18 6L6 18" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" />
          )}
        </svg>
      </button>

      {open && (
        <nav
          id="admin-mobile-nav"
          className="absolute inset-x-0 top-full z-40 flex flex-col gap-1 border-b border-zinc-200 bg-white px-4 py-2 shadow-lg md:hidden dark:border-zinc-800 dark:bg-zinc-900"
        >
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={linkClasses(link.href, true)}
            >
              {link.label}
            </Link>
          ))}
          {signOut(true)}
        </nav>
      )}
    </>
  );
}
