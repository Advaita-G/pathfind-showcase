import { useEffect, useState } from "react";
import { DEMO_PATHFIND_IDEAS } from "../data/pathfindIdeas";
import {
  parseIdeaProgress,
  toggleIdeaSaved,
  toggleIdeaStep,
  type IdeaProgressState,
} from "./ideaProgress";

const STORAGE_KEY = "pathfind:idea-progress";

function readStoredProgress(): IdeaProgressState {
  try {
    return parseIdeaProgress(localStorage.getItem(STORAGE_KEY), DEMO_PATHFIND_IDEAS);
  } catch {
    return parseIdeaProgress(null, DEMO_PATHFIND_IDEAS);
  }
}

export function useIdeaProgress() {
  const [ideaProgress, setIdeaProgress] = useState<IdeaProgressState>(() => readStoredProgress());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ideaProgress));
    } catch {
      // Storage can be unavailable; progress still works in memory for this session.
    }
  }, [ideaProgress]);

  const toggleSaved = (ideaId: string) =>
    setIdeaProgress((current) => toggleIdeaSaved(current, ideaId, Date.now()));

  const toggleStep = (ideaId: string, stepIndex: number) =>
    setIdeaProgress((current) => toggleIdeaStep(current, ideaId, stepIndex, Date.now()));

  return { ideaProgress, toggleSaved, toggleStep };
}
