import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { streamAssistant, AssistantError, type AssistantHistoryMessage } from "../lib/assistantClient";
import { useAuth } from "./AuthContext";
import { readStoredProfile } from "../lib/usePathProfile";
import { readStoredBookmarks } from "../lib/useBookmarks";

/** Messages store record ids only; the drawer resolves them against local data on render. */
export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  opportunityIds?: string[];
  collegeIds?: number[];
}

export interface AssistantChat {
  id: string;
  title: string;
  updatedAt: number;
  messages: AssistantMessage[];
}

export type AssistantStatus = "idle" | "searching" | "writing";

export interface AssistantFailure {
  message: string;
  canRetry: boolean;
}

interface AssistantContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  chats: AssistantChat[];
  activeChat: AssistantChat | null;
  status: AssistantStatus;
  error: AssistantFailure | null;
  /** Opens the drawer and sends a message. `contextOpportunityIds` pins the answer to those records. */
  ask: (text: string, contextOpportunityIds?: string[]) => void;
  retry: () => void;
  stop: () => void;
  newChat: () => void;
  openChat: (id: string) => void;
  deleteChat: (id: string) => void;
}

const AssistantContext = createContext<AssistantContextValue | null>(null);

const MAX_CHATS = 20;
const MAX_MESSAGES = 40;
const HISTORY_SENT = 6;

const newId = () => crypto.randomUUID();

function loadChats(key: string): AssistantChat[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((c) => c && typeof c.id === "string" && Array.isArray(c.messages)) : [];
  } catch {
    return [];
  }
}

export function AssistantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const storageKey = `pathfind:assistant-chats:${user?.id ?? "guest"}`;

  const [isOpen, setIsOpen] = useState(false);
  // Chats are kept together with the key they were loaded from, so switching accounts can never
  // write one account's chats under the other's key.
  const [store, setStore] = useState(() => ({ key: storageKey, chats: loadChats(storageKey) }));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [status, setStatus] = useState<AssistantStatus>("idle");
  const [error, setError] = useState<AssistantFailure | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const lastAskRef = useRef<{ text: string; contextIds?: string[] } | null>(null);
  const chatsRef = useRef(store.chats);
  chatsRef.current = store.chats;
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;

  if (store.key !== storageKey) {
    abortRef.current?.abort();
    setStore({ key: storageKey, chats: loadChats(storageKey) });
    setActiveId(null);
  }

  useEffect(() => {
    // Skip mid-stream writes; the finished reply is saved once status returns to idle.
    if (status !== "idle") return;
    try {
      localStorage.setItem(store.key, JSON.stringify(store.chats.filter((c) => c.messages.length > 0)));
    } catch {
      // Storage full or blocked: chats still work for this visit.
    }
  }, [store, status]);

  const updateChat = useCallback((chatId: string, fn: (chat: AssistantChat) => AssistantChat) => {
    setStore((s) => ({ ...s, chats: s.chats.map((c) => (c.id === chatId ? fn(c) : c)) }));
  }, []);

  const signedIn = !!user;
  const send = useCallback((text: string, contextIds: string[] | undefined, isRetry: boolean) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    lastAskRef.current = { text, contextIds };
    setIsOpen(true);
    setError(null);
    setStatus("searching");

    const existing = chatsRef.current.find((c) => c.id === activeIdRef.current);
    const chatId = existing?.id ?? newId();
    const prior = existing?.messages ?? [];
    // A retry re-sends the question that is already the chat's last message.
    const history: AssistantHistoryMessage[] = (isRetry ? prior.slice(0, -1) : prior)
      .filter((m) => m.text)
      .slice(-HISTORY_SENT)
      .map(({ role, text }) => ({ role, text }));
    const replyId = newId();
    const added: AssistantMessage[] = [
      ...(isRetry ? [] : [{ id: newId(), role: "user" as const, text }]),
      { id: replyId, role: "assistant", text: "" },
    ];

    setStore((s) => {
      const chat = s.chats.find((c) => c.id === chatId) ?? { id: chatId, title: text.slice(0, 80), updatedAt: 0, messages: [] };
      const updated = { ...chat, updatedAt: Date.now(), messages: [...chat.messages, ...added].slice(-MAX_MESSAGES) };
      return { ...s, chats: [updated, ...s.chats.filter((c) => c.id !== chatId)].slice(0, MAX_CHATS) };
    });
    setActiveId(chatId);

    const patchReply = (fn: (m: AssistantMessage) => AssistantMessage) =>
      updateChat(chatId, (c) => ({ ...c, messages: c.messages.map((m) => (m.id === replyId ? fn(m) : m)) }));

    const run = (attempt: number): Promise<void> =>
      streamAssistant(
        {
          message: text,
          history,
          contextOpportunityIds: contextIds?.slice(0, 6),
          // Signed-in students' profile and saves are read server-side from their account.
          ...(signedIn ? {} : { pathProfile: readStoredProfile(), savedOpportunityIds: readStoredBookmarks().slice(0, 20) }),
        },
        (event) => {
          if (event.type === "results") {
            setStatus("writing");
            patchReply((m) => ({ ...m, opportunityIds: event.opportunityIds, collegeIds: event.collegeIds }));
          } else if (event.type === "delta") {
            setStatus("writing");
            patchReply((m) => ({ ...m, text: m.text + event.text }));
          }
        },
        controller.signal,
      ).catch(async (err) => {
        // "busy" usually means the request we just cancelled hasn't released its server slot yet.
        if (err instanceof AssistantError && err.code === "busy" && attempt === 0 && !controller.signal.aborted) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          if (!controller.signal.aborted) return run(1);
        }
        throw err;
      });

    run(0)
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError({
          message: err instanceof AssistantError ? err.message : "Something went wrong. Try again in a moment.",
          canRetry: !(err instanceof AssistantError && err.code === "rate_limited"),
        });
      })
      .finally(() => {
        updateChat(chatId, (c) => ({
          ...c,
          messages: c.messages.filter((m) => m.id !== replyId || m.text || m.opportunityIds?.length || m.collegeIds?.length),
        }));
        if (abortRef.current === controller) {
          abortRef.current = null;
          setStatus("idle");
        }
      });
  }, [updateChat, signedIn]);

  const ask = useCallback((text: string, contextOpportunityIds?: string[]) => {
    const trimmed = text.trim().slice(0, 1000);
    if (trimmed) send(trimmed, contextOpportunityIds, false);
  }, [send]);

  const retry = useCallback(() => {
    if (lastAskRef.current) send(lastAskRef.current.text, lastAskRef.current.contextIds, true);
  }, [send]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus("idle");
  }, []);

  const switchTo = useCallback((id: string | null) => {
    stop();
    setError(null);
    setActiveId(id);
  }, [stop]);

  const deleteChat = useCallback((id: string) => {
    if (activeIdRef.current === id) switchTo(null);
    setStore((s) => ({ ...s, chats: s.chats.filter((c) => c.id !== id) }));
  }, [switchTo]);

  const value: AssistantContextValue = {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    chats: store.chats.filter((c) => c.messages.length > 0),
    activeChat: store.chats.find((c) => c.id === activeId) ?? null,
    status,
    error,
    ask,
    retry,
    stop,
    newChat: () => switchTo(null),
    openChat: switchTo,
    deleteChat,
  };

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}

export function useAssistant(): AssistantContextValue {
  const ctx = useContext(AssistantContext);
  if (!ctx) throw new Error("useAssistant must be used within AssistantProvider");
  return ctx;
}
