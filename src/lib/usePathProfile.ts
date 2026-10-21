import { useEffect, useRef, useState } from "react";
import { TIME_COMMITMENTS, type TimeCommitment } from "../data/types";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { isKnownGoalId } from "./matchPathfindIdeas";

export interface PathProfile {
  colleges: string[];
  interests: string[];
  goals: string[];
  skills: string[];
  causes: string[];
  timeCommitment: TimeCommitment | null;
}

const STORAGE_KEY = "pathfind:path-profile";
const SAVE_DEBOUNCE_MS = 600;

// Custom "Other…" goals typed in the profile drawer aren't known goal ids, but they must
// survive loads (localStorage parse + Supabase fetch) instead of being silently dropped.
// Session-level memory of which custom ids exist; the authoritative list is the profile.
const customGoalIdsCache = new Set<string>();

/** Registers custom goal ids (e.g. from a Supabase fetch) so later parses keep them. */
function withCustomGoals(goals: unknown): string[] {
  if (!Array.isArray(goals)) return [];
  return goals.filter((goal): goal is string => {
    if (typeof goal !== "string" || goal.length === 0) return false;
    if (!isKnownGoalId(goal)) customGoalIdsCache.add(goal);
    return true;
  });
}

function cleanStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(
    value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 100),
  ));
}

function cleanTimeCommitment(value: unknown): TimeCommitment | null {
  return typeof value === "string" && (TIME_COMMITMENTS as readonly string[]).includes(value)
    ? value as TimeCommitment
    : null;
}

const EMPTY_PROFILE: PathProfile = {
  colleges: [],
  interests: [],
  goals: [],
  skills: [],
  causes: [],
  timeCommitment: null,
};

export function parseStoredPathProfile(raw: string | null): PathProfile {
  if (!raw) return { ...EMPTY_PROFILE };

  try {
    const parsed = JSON.parse(raw) as Partial<PathProfile> & { goal?: unknown };
    const storedGoals = Array.isArray(parsed.goals)
      ? withCustomGoals(parsed.goals)
      : typeof parsed.goal === "string" && parsed.goal.length > 0
        ? withCustomGoals([parsed.goal])
        : [];

    return {
      colleges: cleanStringArray(parsed.colleges),
      interests: cleanStringArray(parsed.interests),
      goals: cleanStringArray(storedGoals),
      skills: cleanStringArray(parsed.skills),
      causes: cleanStringArray(parsed.causes),
      timeCommitment: cleanTimeCommitment(parsed.timeCommitment),
    };
  } catch {
    return { ...EMPTY_PROFILE };
  }
}

export function readStoredProfile(): PathProfile {
  try {
    return parseStoredPathProfile(localStorage.getItem(STORAGE_KEY));
  } catch {
    return { ...EMPTY_PROFILE };
  }
}

function writeStoredProfile(profile: PathProfile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // localStorage unavailable (private mode, quota) — nothing else to fall back to here.
  }
}

export function getFirstIncompletePathStep(profile: PathProfile): number | null {
  if (profile.interests.length === 0) return 0;
  if (profile.goals.length === 0) return 1;
  if (profile.timeCommitment === null) return 4;
  return null;
}

export function hasSavedPath(profile: PathProfile): boolean {
  return (
    profile.colleges.length > 0 ||
    profile.interests.length > 0 ||
    profile.goals.length > 0 ||
    profile.skills.length > 0 ||
    profile.causes.length > 0 ||
    profile.timeCommitment !== null
  );
}

export function isSamePathProfile(a: PathProfile, b: PathProfile): boolean {
  const sameList = (x: string[], y: string[]) =>
    x.length === y.length && x.every((value, index) => value === y[index]);
  return (
    sameList(a.colleges, b.colleges) &&
    sameList(a.interests, b.interests) &&
    sameList(a.goals, b.goals) &&
    sameList(a.skills, b.skills) &&
    sameList(a.causes, b.causes) &&
    a.timeCommitment === b.timeCommitment
  );
}

/** Debounced-write body, shared by the effect and `flushPendingSave`. */
function persistPathProfile(userId: string | null, profile: PathProfile) {
  return Promise.resolve(supabase
    .from("profiles")
    .upsert(
      {
        id: userId as string,
        interests: profile.interests,
        goals: profile.goals,
        skills: profile.skills,
        causes: profile.causes,
        dream_colleges: profile.colleges,
        time_commitment: profile.timeCommitment,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .then(({ error }) => {
      if (error) {
        console.error("Error saving path profile:", error);
        throw error;
      }
    }));
}

export function mergePathProfiles(server: PathProfile, local: PathProfile): PathProfile {
  return {
    colleges: Array.from(new Set([...server.colleges, ...local.colleges])),
    interests: Array.from(new Set([...server.interests, ...local.interests])),
    goals: Array.from(new Set([...server.goals, ...local.goals])),
    skills: Array.from(new Set([...server.skills, ...local.skills])),
    causes: Array.from(new Set([...server.causes, ...local.causes])),
    timeCommitment: server.timeCommitment ?? local.timeCommitment,
  };
}

export function usePathProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<PathProfile>(() => readStoredProfile());
  // Snapshot of what the server last sent us. A setProfile is only treated as a
  // "user edit" (and scheduled for save) when it differs from this snapshot —
  // otherwise echo-writes would fire on every auth-event re-render.
  const serverSnapshotRef = useRef<PathProfile | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // False until this instance has learned what the server holds (or dropped into
  // localStorage-only mode). Gates background saves so pre-hydration state — seeded from
  // localStorage on mount — can never overwrite the server row with stale/empty data.
  const hydratedRef = useRef(false);
  // Always-fresh mirror of `profile` for async callbacks and Save flushes: React state
  // updates aren't visible mid-tick to code holding the older value.
  const latestProfileRef = useRef(profile);
  latestProfileRef.current = profile;
  const userId = user?.id ?? null;

  const scheduleSave = (value: PathProfile) => {
    if (!hydratedRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      persistPathProfile(userId, value)
        .then(() => {
          serverSnapshotRef.current = value;
        })
        .catch(() => {
          // Keep the unsaved state eligible for a later edit/retry without crashing the app.
        });
    }, SAVE_DEBOUNCE_MS);
  };

  // Load the right source of truth when auth state changes. The first time a given browser's
  // local path data meets an account (signup, or first login on this device), merge it into
  // the account instead of discarding it — otherwise building a path anonymously and then
  // creating an account would silently wipe out everything just chosen.
  // Keyed on user.id (not object identity): Supabase fires auth events that recreate the
  // user object (e.g. USER_UPDATED after a profile save), and re-syncing then would clobber
  // in-flight edits with a stale server snapshot. userId non-null implies user non-null.
  useEffect(() => {
    if (userId) {
      let cancelled = false;
      // Cancel any save scheduled before hydration (the initial mount seeds state from
      // localStorage): letting it fire would clobber the server row with stale local data —
      // the race that used to erase saved paths shortly after every page load.
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      hydratedRef.current = false;
      const syncKey = `pathfind:path-profile-synced:${userId}`;
      let alreadySynced = false;
      try {
        alreadySynced = localStorage.getItem(syncKey) === "1";
      } catch {
        alreadySynced = true;
      }

      supabase
        .from("profiles")
        .select("interests, goals, skills, causes, dream_colleges, time_commitment")
        .eq("id", userId)
        .single()
        .then(({ data, error }) => {
          if (cancelled) return;
          // Hydrate even on fetch errors so saves stay alive; with the snapshot still null,
          // the next genuine edit is pushed as soon as a request succeeds again.
          hydratedRef.current = true;
          if (error || !data) return;
          const serverProfile: PathProfile = {
            colleges: cleanStringArray(data.dream_colleges),
            interests: cleanStringArray(data.interests),
            goals: cleanStringArray(withCustomGoals(data.goals ?? [])),
            skills: cleanStringArray(data.skills),
            causes: cleanStringArray(data.causes),
            timeCommitment: cleanTimeCommitment(data.time_commitment),
          };
          // The snapshot must describe what the SERVER holds — not a merged result — so the
          // save effect below can tell a real edit from an echo and push the union back.
          serverSnapshotRef.current = serverProfile;

          if (!alreadySynced && hasSavedPath(latestProfileRef.current)) {
            // First meeting of this browser's local path data with the account: merge the
            // local selections in. The snapshot stays at the server profile, so the save
            // effect pushes the union to Supabase (otherwise the local half was silently
            // lost on the next load). latestProfileRef (not a snapshot read at mount) keeps
            // edits made while the fetch was in flight from being clobbered.
            setProfile(mergePathProfiles(serverProfile, latestProfileRef.current));
          } else {
            setProfile(serverProfile);
          }

          try {
            localStorage.setItem(syncKey, "1");
          } catch {
            // Non-fatal — worst case this merge runs again next login.
          }
        });
      return () => {
        cancelled = true;
      };
    }

    // Signed out: localStorage is the only store, so background writes are always safe.
    setProfile(readStoredProfile());
    serverSnapshotRef.current = null;
    hydratedRef.current = true;
    return undefined;
  }, [userId]);

  // Persist on change: localStorage when signed out, debounced Supabase upsert when signed in.
  // Only actual edits (state ≠ last server snapshot) schedule a save, so echo updates from
  // auth events / refetches never trigger redundant writes — and nothing is scheduled before
  // hydration, so a fresh page load can't write the localStorage seed over the server row.
  // The pending timer survives unmount: the drawer saves then unmounts, which used to cancel
  // the debounced write before it fired — one reason "Save profile" appeared to do nothing.
  useEffect(() => {
    if (!userId) {
      writeStoredProfile(latestProfileRef.current);
      return;
    }

    const snapshot = serverSnapshotRef.current;
    if (snapshot && isSamePathProfile(snapshot, latestProfileRef.current)) return;

    scheduleSave(latestProfileRef.current);
  }, [userId, profile]);

  const updateProfile = (partial: Partial<PathProfile>) => {
    if (partial.goals) {
      for (const goal of partial.goals) {
        if (!isKnownGoalId(goal)) customGoalIdsCache.add(goal);
      }
    }
    setProfile((current) => ({ ...current, ...partial }));
  };

  // Fires a Supabase save immediately (used by the profile drawer's Save button so closing
  // the drawer can't cancel the debounced write). `override` carries the drawer's exact
  // selections: React refs don't update mid-tick, so a same-tick updateProfile wouldn't be
  // visible in latestProfileRef yet. Writing the same value into latestProfileRef and the
  // snapshot keeps the follow-up effect run from scheduling a redundant second save.
  const flushPendingSave = async (override?: Partial<PathProfile>): Promise<void> => {
    if (!userId) return;
    if (!hydratedRef.current) return; // drawer can't be open before hydration anyway
    const value = override
      ? { ...latestProfileRef.current, ...override }
      : latestProfileRef.current;
    latestProfileRef.current = value;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    await persistPathProfile(userId, value);
    serverSnapshotRef.current = value;
  };

  return { profile, updateProfile, flushPendingSave };
}
