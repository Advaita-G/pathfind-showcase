import type { User } from "@supabase/supabase-js";

// Google OAuth metadata doesn't carry the same keys the old email/password signup used
// (first_name/last_name) — it gives us given_name/family_name, or just a single full_name/name.
export function getNameParts(user: User): { firstName: string; lastName: string } {
  const meta = user.user_metadata ?? {};
  if (meta.first_name || meta.last_name) {
    return { firstName: meta.first_name ?? "", lastName: meta.last_name ?? "" };
  }
  if (meta.given_name || meta.family_name) {
    return { firstName: meta.given_name ?? "", lastName: meta.family_name ?? "" };
  }

  const fullName: string = meta.full_name ?? meta.name ?? "";
  const [firstName = "", ...rest] = fullName.trim().split(/\s+/).filter(Boolean);
  return { firstName, lastName: rest.join(" ") };
}

export function getDisplayFirstName(user: User): string {
  return getNameParts(user).firstName || "Account";
}
