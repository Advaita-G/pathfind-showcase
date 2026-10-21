import type { PathfindIdea } from "../data/pathfindIdeas";

export interface IdeaProgressRecord {
  saved: boolean;
  savedAt: number;
  completedSteps: number[];
}

export interface IdeaProgressState {
  version: 1;
  ideas: Record<string, IdeaProgressRecord>;
}

export const EMPTY_IDEA_PROGRESS: IdeaProgressState = {
  version: 1,
  ideas: {},
};

function sanitizeRecord(value: unknown, roadmapLength: number): IdeaProgressRecord | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<IdeaProgressRecord>;
  const completedSteps = Array.isArray(record.completedSteps)
    ? Array.from(new Set(record.completedSteps.filter(
        (step): step is number => Number.isInteger(step) && step >= 0 && step < roadmapLength,
      ))).sort((a, b) => a - b)
    : [];
  const saved = record.saved === true;
  const savedAt = typeof record.savedAt === "number" && Number.isFinite(record.savedAt)
    ? record.savedAt
    : 0;

  if (!saved && completedSteps.length === 0) return null;
  return { saved, savedAt, completedSteps };
}

export function parseIdeaProgress(
  raw: string | null,
  ideas: PathfindIdea[],
): IdeaProgressState {
  if (!raw) return { ...EMPTY_IDEA_PROGRESS, ideas: {} };

  try {
    const parsed = JSON.parse(raw) as Partial<IdeaProgressState>;
    if (!parsed.ideas || typeof parsed.ideas !== "object") {
      return { ...EMPTY_IDEA_PROGRESS, ideas: {} };
    }

    const catalog = new Map(ideas.map((idea) => [idea.id, idea]));
    const records: Record<string, IdeaProgressRecord> = {};
    for (const [ideaId, value] of Object.entries(parsed.ideas)) {
      const idea = catalog.get(ideaId);
      if (!idea) continue;
      const record = sanitizeRecord(value, idea.roadmap.length);
      if (record) records[ideaId] = record;
    }

    return { version: 1, ideas: records };
  } catch {
    return { ...EMPTY_IDEA_PROGRESS, ideas: {} };
  }
}

export function toggleIdeaSaved(
  state: IdeaProgressState,
  ideaId: string,
  savedAt: number,
): IdeaProgressState {
  const current = state.ideas[ideaId] ?? {
    saved: false,
    savedAt: 0,
    completedSteps: [],
  };
  const saved = !current.saved;

  return {
    version: 1,
    ideas: {
      ...state.ideas,
      [ideaId]: {
        ...current,
        saved,
        savedAt: saved && current.savedAt === 0 ? savedAt : current.savedAt,
      },
    },
  };
}

export function toggleIdeaStep(
  state: IdeaProgressState,
  ideaId: string,
  stepIndex: number,
  savedAt: number,
): IdeaProgressState {
  const current = state.ideas[ideaId] ?? {
    saved: false,
    savedAt: 0,
    completedSteps: [],
  };
  const completedSteps = current.completedSteps.includes(stepIndex)
    ? current.completedSteps.filter((step) => step !== stepIndex)
    : [...current.completedSteps, stepIndex].sort((a, b) => a - b);

  return {
    version: 1,
    ideas: {
      ...state.ideas,
      [ideaId]: {
        saved: true,
        savedAt: current.savedAt || savedAt,
        completedSteps,
      },
    },
  };
}
