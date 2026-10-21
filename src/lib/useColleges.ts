import { useEffect, useState } from "react";
import { loadColleges, type College } from "../data/colleges";
import { buildCollegeIndex, type CollegeSearchIndex } from "./collegeSearch";

export type CollegeDirectoryStatus = "idle" | "loading" | "ready" | "error";

export interface CollegeDirectory {
  status: CollegeDirectoryStatus;
  colleges: College[];
  index: CollegeSearchIndex | null;
  retry: () => void;
}

// Built once per session and shared by every consumer (Build My Path, Profile). Every mounted
// hook instance subscribes, so a component that only *reads* the directory (enabled=false) still
// re-renders when the picker next to it triggers the load.
let cachedIndex: CollegeSearchIndex | null = null;
let cachedColleges: College[] = [];
let sharedStatus: CollegeDirectoryStatus = "idle";
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function publish(status: CollegeDirectoryStatus) {
  sharedStatus = status;
  for (const listener of listeners) listener();
}

function startLoad() {
  if (cachedIndex || inflight) return;
  publish("loading");
  inflight = loadColleges()
    .then((colleges) => {
      cachedColleges = colleges;
      cachedIndex = buildCollegeIndex(colleges);
      publish("ready");
    })
    .catch(() => {
      publish("error");
    })
    .finally(() => {
      inflight = null;
    });
}

/**
 * Loads the ~100 KB (gzipped) IPEDS directory the first time a component that needs it mounts,
 * i.e. when the student actually reaches a college picker — never on the landing page.
 * Pass `enabled: false` to only observe (and re-render on) a load started elsewhere.
 */
export function useColleges(enabled = true): CollegeDirectory {
  const [, rerender] = useState(0);

  useEffect(() => {
    const listener = () => rerender((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (enabled) startLoad();
  }, [enabled]);

  return {
    status: cachedIndex ? "ready" : sharedStatus,
    colleges: cachedColleges,
    index: cachedIndex,
    retry: () => {
      if (sharedStatus === "error") startLoad();
    },
  };
}

