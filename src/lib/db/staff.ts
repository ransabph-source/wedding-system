import "server-only";
import { getSupabase } from "@/lib/supabase/server";
import { listAuthUsers } from "@/lib/db/clients";
import type { StaffAccount } from "@/types/staff";

// Every 'staff' account, newest first.
export async function listStaff(): Promise<StaffAccount[]> {
  const [profiles, users] = await Promise.all([
    getSupabase()
      .from("profiles")
      .select("id, created_at")
      .eq("role", "staff")
      .order("created_at", { ascending: false }),
    listAuthUsers(),
  ]);
  if (profiles.error) throw profiles.error;

  return (profiles.data as { id: string; created_at: string }[]).map(
    (profile) => {
      const user = users.get(profile.id);
      return {
        userId: profile.id,
        email: user?.email,
        name: (user?.user_metadata?.full_name as string | undefined) ?? "",
        createdAt: profile.created_at,
        lastSignInAt: user?.last_sign_in_at ?? null,
      };
    },
  );
}

// True only for 'staff' accounts, so the staff routes can't touch admins or
// couples.
export async function isStaffAccount(userId: string): Promise<boolean> {
  const { data, error } = await getSupabase()
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle<{ role: string }>();
  if (error) throw error;
  return data?.role === "staff";
}
