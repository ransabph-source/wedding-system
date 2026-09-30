"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useEventEngine } from "@/lib/eventEngine";
import type { UserRole } from "@/types/event";

interface MockAccount {
  username: string;
  password: string;
  role: UserRole;
  href: string;
}

// Mock auth only — three hard-coded accounts standing in for the three
// portal roles until real authentication/session lookup exists.
const MOCK_ACCOUNTS: MockAccount[] = [
  { username: "admin", password: "1234", role: "admin", href: "/admin" },
  { username: "staff", password: "1234", role: "hostess", href: "/live/mock-1" },
  { username: "couple", password: "1234", role: "couple", href: "/couple/mock-1" },
];

const inputClasses =
  "rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-2.5 text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50";

const labelClasses = "text-sm font-medium text-zinc-700 dark:text-zinc-300";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const router = useRouter();
  const { setUserRole } = useEventEngine();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const account = MOCK_ACCOUNTS.find(
      (candidate) =>
        candidate.username === username.trim() &&
        candidate.password === password,
    );

    if (!account) {
      setError(true);
      return;
    }

    setError(false);
    setUserRole(account.role);
    router.push(account.href);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200 px-4 dark:from-zinc-950 dark:to-zinc-900">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl ring-1 ring-black/5 dark:bg-zinc-900">
        <div className="mb-6 flex justify-center">
          {!logoFailed && (
            <Image
              src="/logo.png"
              alt=""
              width={1408}
              height={768}
              priority
              onError={() => setLogoFailed(true)}
              className="h-20 w-auto object-contain"
            />
          )}
        </div>

        <h1 className="mb-1 text-center text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          מערכת ניהול אירועים
        </h1>
        <p className="mb-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          התחברו כדי להמשיך
        </p>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
          dir="rtl"
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="username" className={labelClasses}>
              שם משתמש
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError(false);
              }}
              placeholder="הזינו שם משתמש"
              autoComplete="username"
              className={inputClasses}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className={labelClasses}>
              סיסמה
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              placeholder="הזינו סיסמה"
              autoComplete="current-password"
              className={inputClasses}
              required
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 px-3 py-2 text-center text-sm font-medium text-red-600 dark:bg-red-500/10 dark:text-red-400"
            >
              שם משתמש או סיסמה שגויים
            </p>
          )}

          <button
            type="submit"
            className="mt-2 rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white transition hover:bg-indigo-700 active:bg-indigo-800"
          >
            היכנס למערכת
          </button>
        </form>
      </div>
    </div>
  );
}
