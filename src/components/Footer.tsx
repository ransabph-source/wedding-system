import Link from "next/link";
import CookieBanner from "@/components/CookieBanner";

const LEGAL_LINKS = [
  { href: "/terms", label: "תקנון ותנאי שימוש" },
  { href: "/privacy", label: "מדיניות פרטיות" },
  { href: "/accessibility", label: "הצהרת נגישות" },
] as const;

// Footer with the legal links, shown only on public pages: login, the guest
// RSVP and self check-in pages, and the legal pages. Internal working screens
// leave it out. It also brings the cookie banner, so that only shows on
// public pages too.
export default function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-white px-4 py-6 text-sm text-zinc-600 print:hidden dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <nav aria-labelledby="footer-legal">
          <h2 id="footer-legal" className="mb-2 font-semibold text-zinc-900 dark:text-zinc-100">
            מידע משפטי
          </h2>
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            {LEGAL_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="underline-offset-4 hover:text-zinc-900 hover:underline dark:hover:text-white"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="text-zinc-500">© {new Date().getFullYear()} I R Sidurim</p>
      </div>
      <CookieBanner />
    </footer>
  );
}
