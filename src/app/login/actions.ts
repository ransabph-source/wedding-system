"use server";

import { redirect } from "next/navigation";
import {
  getHomePath,
  getRole,
  loginNextPath,
  NO_HOME_MESSAGES,
  type HomeResult,
  type ProfileRole,
} from "@/lib/auth";
import { createAuthClient } from "@/lib/supabase/auth";

// Returns an error message to show, or redirects to the user's home page:
// admins to the dashboard, staff to the live event picker (either to ?next=
// if it's in an area they may open) and couples to their event.
export async function signIn(
  _prev: string | null,
  formData: FormData,
): Promise<string | null> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return "יש למלא אימייל וסיסמה";

  const supabase = await createAuthClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    if (error.code !== "invalid_credentials") console.error(error);
    return error.code === "invalid_credentials"
      ? "אימייל או סיסמה שגויים"
      : "ההתחברות נכשלה. נסו שוב.";
  }

  let home: HomeResult;
  let role: ProfileRole | null;
  try {
    role = await getRole(data.user.id);
    home = await getHomePath(data.user.id, role);
  } catch (lookupError) {
    console.error(lookupError);
    await supabase.auth.signOut();
    return "ההתחברות נכשלה. נסו שוב.";
  }

  // Don't leave the user signed in with nowhere to go.
  if (!home.ok) {
    await supabase.auth.signOut();
    return NO_HOME_MESSAGES[home.reason];
  }

  redirect(loginNextPath(formData.get("next"), role) ?? home.path);
}
