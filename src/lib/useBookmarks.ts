import { useEffect, useRef, useState } from "react";
import { toggleBookmark } from "./bookmarks";
import { OPPORTUNITIES } from "../data/opportunities";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { isHydrating } from "./hydration";
import type { User } from "@supabase/supabase-js";

const STORAGE_KEY = "pathfind:bookmarks";
const VALID_OPPORTUNITY_IDS = new Set(OPPORTUNITIES.map((opportunity) => opportunity.id));

export function readStoredBookmarks(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? Array.from(new Set(parsed.filter(
          (id): id is string => typeof id === "string" && VALID_OPPORTUNITY_IDS.has(id),
        )))
      : [];
  } catch {
    return [];
  }
}

function writeStoredBookmarks(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // localStorage unavailable (private mode, quota) — nothing else to fall back to here.
  }
}

export function mergeBookmarks(serverIds: string[], localIds: string[]) {
  const validServerIds = serverIds.filter((id) => VALID_OPPORTUNITY_IDS.has(id));
  const validLocalIds = localIds.filter((id) => VALID_OPPORTUNITY_IDS.has(id));
  const missingLocalIds = validLocalIds.filter((id) => !validServerIds.includes(id));
  return {
    merged: Array.from(new Set([...validServerIds, ...missingLocalIds])),
    missingLocalIds,
  };
}

export function useBookmarks() {
  const { user } = useAuth();
  // On a prerendered page the server has no localStorage, so rendering stored bookmarks
  // on the first pass would hydrate "Saved" onto a button the server rendered as "Save"
  // (React error #418). Those pages start empty and fill in from the effect below; the
  // homepage isn't prerendered, so it can read storage synchronously and skip the flicker.
  const [bookmarks, setBookmarks] = useState<string[]>(() =>
    isHydrating() ? [] : readStoredBookmarks(),
  );
  const bookmarksRef = useRef(bookmarks);
  const [pendingBookmarkIds, setPendingBookmarkIds] = useState<string[]>([]);
  const userRef = useRef<User | null>(user);
  userRef.current = user;
  // Storage may only be written once the initial read has happened — otherwise the first
  // pass would persist an empty list over what the student saved on a previous visit.
  const storageReadRef = useRef(false);
  const writeQueueRef = useRef<Record<string, Promise<void>>>({});
  const writeVersionRef = useRef<Record<string, number>>({});
  const pendingBookmarkIdsRef = useRef(new Set<string>());

  const queueWrite = (
    id: string,
    write: () => PromiseLike<unknown>,
    onError?: () => void,
    onSettled?: () => void,
  ) => {
    const previous = writeQueueRef.current[id] ?? Promise.resolve();
    const next = previous
      .catch(() => undefined)
      .then(() => write())
      .then(() => undefined)
      .catch((error) => {
        onError?.();
        throw error;
      });
    writeQueueRef.current[id] = next;
    void next.catch((error) => {
      console.error("Error syncing saved opportunity:", error);
    }).finally(() => {
      if (writeQueueRef.current[id] === next) delete writeQueueRef.current[id];
      onSettled?.();
    });
  };

  // Anonymous users persist to localStorage only — signed-in writes happen per-toggle below.
  // This effect is declared *before* the loader so that on the very first pass — before
  // storage has been read — it can't overwrite stored bookmarks with an empty list.
  useEffect(() => {
    // `bookmarks !== ref` means this render's state is stale (StrictMode replays effects with
    // the first render's empty list after the loader has already read storage) — don't persist it.
    if (user || !storageReadRef.current || bookmarks !== bookmarksRef.current) return;
    writeStoredBookmarks(bookmarks);
  }, [user, bookmarks]);

  // Load the right source of truth when auth state changes. The first time a given browser's
  // local bookmarks meet an account (signup, or first login on this device), merge them into
  // the account instead of discarding them — otherwise saving opportunities anonymously and
  // then creating an account would silently wipe out everything just saved.
  useEffect(() => {
    if (user) {
      // Signed-in bookmarks come from (and are written to) the database, not localStorage.
      storageReadRef.current = true;
      let cancelled = false;
      const syncKey = `pathfind:bookmarks-synced:${user.id}`;
      let alreadySynced = false;
      try {
        alreadySynced = localStorage.getItem(syncKey) === "1";
      } catch {
        alreadySynced = true;
      }
      const localIds = alreadySynced ? [] : readStoredBookmarks();

      supabase
        .from("saved_opportunities")
        .select("opportunity_id")
        .eq("user_id", user.id)
        .then(({ data, error }) => {
          if (cancelled || error || !data) return;
          const serverIds = data.map((row) => row.opportunity_id);
          const { merged, missingLocalIds } = mergeBookmarks(serverIds, localIds);

          if (missingLocalIds.length > 0) {
            queueWrite("__initial_sync__", () =>
              supabase
                .from("saved_opportunities")
                .upsert(
                  missingLocalIds.map((id) => ({ user_id: user.id, opportunity_id: id })),
                  { onConflict: "user_id,opportunity_id" },
                )
                .then(({ error: upsertError }) => {
                  if (upsertError) throw upsertError;
                }),
            );
          }

          bookmarksRef.current = merged;
          setBookmarks(merged);
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

    const stored = readStoredBookmarks();
    bookmarksRef.current = stored;
    setBookmarks(stored);
    storageReadRef.current = true;
    return undefined;
  }, [user]);

  const toggle = (id: string) => {
    if (!VALID_OPPORTUNITY_IDS.has(id)) return;
    if (pendingBookmarkIdsRef.current.has(id)) return;
    const wasSaved = bookmarksRef.current.includes(id);
    const currentUser = userRef.current;
    const writeVersion = (writeVersionRef.current[id] ?? 0) + 1;
    writeVersionRef.current[id] = writeVersion;
    bookmarksRef.current = toggleBookmark(bookmarksRef.current, id);
    setBookmarks(bookmarksRef.current);
    const rollbackIfLatest = () => {
      if (writeVersionRef.current[id] !== writeVersion) return;
      bookmarksRef.current = toggleBookmark(bookmarksRef.current, id);
      setBookmarks(bookmarksRef.current);
    };

    if (currentUser) {
        pendingBookmarkIdsRef.current.add(id);
        setPendingBookmarkIds((pending) => [...pending, id]);
        const clearPending = () => {
          pendingBookmarkIdsRef.current.delete(id);
          setPendingBookmarkIds((pending) => pending.filter((pendingId) => pendingId !== id));
        };
        if (wasSaved) {
          queueWrite(id, () =>
            supabase
              .from("saved_opportunities")
              .delete()
              .eq("user_id", currentUser.id)
              .eq("opportunity_id", id)
              .then(({ error }) => {
                if (error) throw error;
              }),
            rollbackIfLatest,
            clearPending,
          );
        } else {
          queueWrite(id, () =>
            supabase
              .from("saved_opportunities")
              .upsert({ user_id: currentUser.id, opportunity_id: id }, { onConflict: "user_id,opportunity_id" })
              .then(({ error }) => {
                if (error) throw error;
              }),
            rollbackIfLatest,
            clearPending,
          );
        }
    }
  };

  return { bookmarks, pendingBookmarkIds, toggle };
}
