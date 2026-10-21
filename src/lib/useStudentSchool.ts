import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "./supabaseClient";

/**
 * The signed-in student's school, read-only, for "Find a team or club" (priority #1 there
 * is the student's own school). Starts `null` on every render — including the prerendered
 * HTML — and fills in client-side only, so it can never disagree with the server markup.
 * Failure is silent: a missing school just falls back to generic next steps.
 */
export function useStudentSchool(): string | null {
  const { user } = useAuth();
  const [school, setSchool] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setSchool(null);
      return;
    }
    let cancelled = false;
    supabase
      .from("profiles")
      .select("school")
      .eq("id", user.id)
      .single()
      .then(({ data, error }) => {
        if (cancelled || error || !data?.school) return;
        setSchool(data.school);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return school;
}
