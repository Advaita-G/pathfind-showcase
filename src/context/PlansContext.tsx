import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { OPPORTUNITIES } from "../data/opportunities";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "./AuthContext";
import { PLANS_STORAGE_KEY, cleanPlan, mergePlans, parsePlans } from "../lib/planner/plansStore";
import type { OpportunityPlan } from "../lib/planner/types";

const VALID_IDS = new Set(OPPORTUNITIES.map((o) => o.id));
const SAVE_DEBOUNCE_MS = 600;

interface PlansContextType {
  plans: Record<string, OpportunityPlan>;
  syncError: string | null;
  savePlan: (plan: OpportunityPlan) => void;
  removePlan: (opportunityId: string) => void;
}

const PlansContext = createContext<PlansContextType | undefined>(undefined);

export function usePlans() {
  const ctx = useContext(PlansContext);
  if (!ctx) throw new Error("usePlans must be used within a PlansProvider");
  return ctx;
}

function writeLocal(plans: Record<string, OpportunityPlan>) {
  try {
    localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(plans));
  } catch {
    // Storage unavailable (private mode, quota): plans still live in memory for this visit.
  }
}

async function upsertPlan(userId: string, plan: OpportunityPlan) {
  const { error } = await supabase.from("opportunity_plans").upsert(
    { user_id: userId, opportunity_id: plan.opportunityId, status: plan.status, steps: plan.steps, notes: plan.notes },
    { onConflict: "user_id,opportunity_id" },
  );
  if (error) throw error;
}

export function PlansProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // Starts empty so prerendered HTML and first client render match; storage fills in after mount.
  const [plans, setPlans] = useState<Record<string, OpportunityPlan>>({});
  const [syncError, setSyncError] = useState<string | null>(null);
  const loaded = useRef(false);
  const userId = user?.id ?? null;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const local = parsePlans(localStorage.getItem(PLANS_STORAGE_KEY), VALID_IDS);
    setPlans(local);
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!userId || !loaded.current) return;
    let cancelled = false;
    supabase
      .from("opportunity_plans")
      .select("opportunity_id,status,steps,notes,updated_at")
      .eq("user_id", userId)
      .then(async ({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setSyncError("Could not load your saved plans. Showing what is on this device.");
          return;
        }
        const server: Record<string, OpportunityPlan> = {};
        for (const row of data ?? []) {
          const plan = cleanPlan({ opportunityId: row.opportunity_id, status: row.status, steps: row.steps, notes: row.notes, updatedAt: row.updated_at }, VALID_IDS);
          if (plan) server[plan.opportunityId] = plan;
        }
        const { merged, upload } = mergePlans(server, parsePlans(localStorage.getItem(PLANS_STORAGE_KEY), VALID_IDS));
        setPlans(merged);
        writeLocal(merged);
        try {
          for (const plan of upload) await upsertPlan(userId, plan);
          setSyncError(null);
        } catch {
          setSyncError("Some plans could not be saved to your account yet. They are kept on this device.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const savePlan = useCallback((plan: OpportunityPlan) => {
    const next = { ...plan, updatedAt: new Date().toISOString() };
    setPlans((prev) => {
      const all = { ...prev, [next.opportunityId]: next };
      writeLocal(all);
      return all;
    });
    clearTimeout(timers.current[next.opportunityId]);
    timers.current[next.opportunityId] = setTimeout(() => {
      const uid = userIdRef.current;
      if (!uid) return;
      upsertPlan(uid, next).then(() => setSyncError(null), () => setSyncError("Your latest change is saved on this device but not yet in your account."));
    }, SAVE_DEBOUNCE_MS);
  }, []);

  const removePlan = useCallback((opportunityId: string) => {
    clearTimeout(timers.current[opportunityId]);
    setPlans((prev) => {
      const { [opportunityId]: _gone, ...rest } = prev;
      writeLocal(rest);
      return rest;
    });
    const uid = userIdRef.current;
    if (uid) {
      supabase.from("opportunity_plans").delete().eq("user_id", uid).eq("opportunity_id", opportunityId)
        .then(({ error }) => { if (error) setSyncError("Could not remove the plan from your account."); });
    }
  }, []);

  const value = useMemo(() => ({ plans, syncError, savePlan, removePlan }), [plans, syncError, savePlan, removePlan]);
  return <PlansContext.Provider value={value}>{children}</PlansContext.Provider>;
}
