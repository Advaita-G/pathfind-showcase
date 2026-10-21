import { MAX_STEPS, type OpportunityPlan, type PlanStatus, type PlanStep } from "./types";

export const PLANS_STORAGE_KEY = "pathfind:plans";
const STATUSES: PlanStatus[] = ["planning", "applying", "applied", "done", "dropped"];
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function cleanStep(value: unknown): PlanStep | null {
  if (!value || typeof value !== "object") return null;
  const s = value as Record<string, unknown>;
  if (typeof s.id !== "string" || typeof s.title !== "string" || !s.title.trim()) return null;
  const step: PlanStep = {
    id: s.id.slice(0, 64),
    title: s.title.trim().slice(0, 200),
    kind: s.kind === "official" ? "official" : "suggested",
    done: s.done === true,
  };
  if (typeof s.due === "string" && ISO_DAY.test(s.due)) step.due = s.due;
  if (typeof s.note === "string" && s.note.trim()) step.note = s.note.trim().slice(0, 500);
  if (typeof s.lead === "number" && Number.isFinite(s.lead)) step.lead = s.lead;
  if (s.dueEdited === true) step.dueEdited = true;
  return step;
}

export function cleanPlan(value: unknown, validIds?: Set<string>): OpportunityPlan | null {
  if (!value || typeof value !== "object") return null;
  const p = value as Record<string, unknown>;
  if (typeof p.opportunityId !== "string" || (validIds && !validIds.has(p.opportunityId))) return null;
  const steps = Array.isArray(p.steps)
    ? p.steps.map(cleanStep).filter((s): s is PlanStep => s !== null).slice(0, MAX_STEPS)
    : [];
  return {
    opportunityId: p.opportunityId,
    status: STATUSES.includes(p.status as PlanStatus) ? (p.status as PlanStatus) : "planning",
    steps,
    notes: typeof p.notes === "string" ? p.notes.slice(0, 2000) : "",
    updatedAt: typeof p.updatedAt === "string" ? p.updatedAt : new Date(0).toISOString(),
  };
}

export function parsePlans(raw: string | null, validIds?: Set<string>): Record<string, OpportunityPlan> {
  try {
    const data: unknown = raw ? JSON.parse(raw) : {};
    if (!data || typeof data !== "object") return {};
    const out: Record<string, OpportunityPlan> = {};
    for (const value of Object.values(data as object)) {
      const plan = cleanPlan(value, validIds);
      if (plan) out[plan.opportunityId] = plan;
    }
    return out;
  } catch {
    return {};
  }
}

/** Newer `updatedAt` wins per opportunity. `upload` lists plans the server lacks or has older. */
export function mergePlans(server: Record<string, OpportunityPlan>, local: Record<string, OpportunityPlan>) {
  const merged = { ...server };
  const upload: OpportunityPlan[] = [];
  for (const plan of Object.values(local)) {
    const remote = server[plan.opportunityId];
    if (!remote || remote.updatedAt < plan.updatedAt) {
      merged[plan.opportunityId] = plan;
      upload.push(plan);
    }
  }
  return { merged, upload };
}
