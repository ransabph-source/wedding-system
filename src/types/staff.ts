// A staff (hostess) account in the admin's staff list.
export interface StaffAccount {
  userId: string;
  // Undefined if the Auth user is missing.
  email: string | undefined;
  name: string;
  createdAt: string;
  // Null if they've never signed in.
  lastSignInAt: string | null;
}
