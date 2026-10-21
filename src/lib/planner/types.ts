export type StepKind = "official" | "suggested";
export type PlanStatus = "planning" | "applying" | "applied" | "done" | "dropped";

export interface PlanStep {
  id: string;
  title: string;
  /** "official" comes from the program's own record; "suggested" is a Pathfind template. */
  kind: StepKind;
  /** ISO date. Only ever derived from a confirmed deadline or typed by the student. */
  due?: string;
  done: boolean;
  note?: string;
  /** Days before the confirmed deadline this step was scheduled; lets dates follow a moved deadline. */
  lead?: number;
  /** The student picked this date, so it is never recomputed. */
  dueEdited?: boolean;
}

export interface OpportunityPlan {
  opportunityId: string;
  status: PlanStatus;
  steps: PlanStep[];
  notes: string;
  updatedAt: string;
}

export const MAX_STEPS = 60;
