import { redirect } from "next/navigation";
import { getCurrentUser, getHomePath } from "@/lib/auth";

// Sends each user to their own home page: admins to the dashboard, couples to
// their event and staff to the live event picker. Signed-out users, and
// signed-in users with nowhere to go, land on /login, which explains why.
export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const home = await getHomePath(user.id, user.role);
  redirect(home.ok ? home.path : "/login");
}
