import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../supabaseClient";

export interface StudentBasics { grade: number | null; state: string | null }

/** Grade and state from the signed-in profile; null (unknown) for guests or on any failure. */
export function useStudentBasics(): StudentBasics {
  const { user } = useAuth();
  const [basics, setBasics] = useState<StudentBasics>({ grade: null, state: null });
  useEffect(() => {
    if (!user) {
      setBasics({ grade: null, state: null });
      return;
    }
    let cancelled = false;
    supabase.from("profiles").select("grade,state").eq("id", user.id).single().then(({ data, error }) => {
      if (cancelled || error || !data) return;
      setBasics({ grade: data.grade ?? null, state: data.state ?? null });
    });
    return () => { cancelled = true; };
  }, [user]);
  return basics;
}
