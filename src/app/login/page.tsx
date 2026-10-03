import { redirect } from "next/navigation";
import {
  getCurrentUser,
  getHomePath,
  loginNextPath,
  NO_HOME_MESSAGES,
} from "@/lib/auth";
import LoginForm from "./LoginForm";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  // Checked against the role again once we know who signs in.
  const nextPath = loginNextPath(next);

  // Already signed in: go straight to the user's home page. If they have none
  // (e.g. their event was deleted), show the form so they can switch accounts.
  const user = await getCurrentUser();
  let notice: string | null = null;
  if (user) {
    const home = await getHomePath(user.id, user.role).catch(() => null);
    if (home?.ok) {
      redirect(loginNextPath(nextPath, user.role) ?? home.path);
    }
    if (home) notice = NO_HOME_MESSAGES[home.reason];
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-zinc-100 px-4 py-8 dark:bg-zinc-950">
      <div className="w-full max-w-sm">
        <h1 className="mb-4 text-2xl font-bold sm:text-xl text-zinc-900 dark:text-zinc-50">
          התחברות
        </h1>
        <LoginForm next={nextPath ?? ""} initialError={notice} />
      </div>
    </div>
  );
}
