"use client";

import { useActionState } from "react";
import { signIn } from "./actions";

const inputClasses =
  "w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-1 ring-inset ring-zinc-200 transition focus:ring-2 focus:ring-indigo-500/50 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700";

const labelClasses =
  "mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-300";

export default function LoginForm({
  next,
  initialError = null,
}: {
  next: string;
  initialError?: string | null;
}) {
  const [error, formAction, pending] = useActionState(signIn, initialError);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-xl bg-white p-5 shadow-md ring-1 ring-black/5 dark:bg-zinc-900"
    >
      <input type="hidden" name="next" value={next} />

      <div>
        <label htmlFor="email" className={labelClasses}>
          אימייל
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          dir="ltr"
          autoComplete="email"
          className={inputClasses}
        />
      </div>

      <div>
        <label htmlFor="password" className={labelClasses}>
          סיסמה
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          dir="ltr"
          autoComplete="current-password"
          className={inputClasses}
        />
      </div>

      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "מתחבר..." : "התחברות"}
      </button>
    </form>
  );
}
