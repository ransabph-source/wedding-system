import type { ProfileRole } from "@/lib/auth";

// The signed-in areas and the roles that may open them. src/proxy.ts uses
// this for its early redirects; the layouts and API routes check again.
//
// Kept apart from lib/auth because the proxy can't import "server-only"
// modules.
export const AREA_ROLES = {
  "/admin": ["admin"],
  "/api/admin": ["admin"],
  "/couple": ["admin", "couple"],
  "/live": ["admin", "staff"],
} as const satisfies Record<string, readonly ProfileRole[]>;

export type Area = keyof typeof AREA_ROLES;

const AREAS = Object.keys(AREA_ROLES) as Area[];

// The area a path (optionally with a query string) belongs to, matched by
// whole path segments so /administer isn't /admin.
export function areaOf(path: string): Area | null {
  return (
    AREAS.find((area) => new RegExp(`^${area}(/|\\?|$)`).test(path)) ?? null
  );
}

export function canOpenArea(role: ProfileRole | null, area: Area): boolean {
  return role !== null && (AREA_ROLES[area] as readonly string[]).includes(role);
}
