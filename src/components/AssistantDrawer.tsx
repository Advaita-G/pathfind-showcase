import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowUp, ArrowUpRight, History, Square, SquarePen, Trash2, X } from "lucide-react";
import { useAssistant, type AssistantChat, type AssistantMessage } from "../context/AssistantContext";
import { useEscapeToClose } from "../lib/useEscapeToClose";
import { useBookmarks } from "../lib/useBookmarks";
import { useToday } from "../lib/useToday";
import { daysUntil, formatDeadline } from "../lib/formatDeadline";
import { deadlineNotice } from "../lib/opportunityStatus";
import { resolveCollegeIds, resolveOpportunityIds } from "../lib/assistantCatalog";
import { describeCollege, loadColleges, type College } from "../data/colleges";
import type { Opportunity } from "../data/types";
import { IconBookmark } from "./icons";

const SUGGESTIONS = [
  "What should I apply to next?",
  "Free research programs",
  "What's closing soon?",
  "Coding competitions for 10th grade",
];

/** Renders **bold** spans from model text without ever interpreting HTML. */
function renderText(text: string): ReactNode[] {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : part));
}

function chatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toDateString() === new Date().toDateString()
    ? date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function DeadlineMeta({ opportunity, today }: { opportunity: Opportunity; today: Date }) {
  if (!opportunity.deadline) return <span>{deadlineNotice(opportunity, today) ?? "Rolling"}</span>;
  const days = daysUntil(opportunity.deadline, today);
  if (days < 0) return <span>Closed this cycle</span>;
  const date = formatDeadline(opportunity.deadline).replace(/, \d{4}$/, "");
  if (opportunity.deadlineConfirmed === false) return <span title="Estimated from last year's cycle">Est. {date}</span>;
  return <span className={days <= 14 ? "is-urgent" : undefined}>{days <= 14 ? `Due in ${days}d` : `Due ${date}`}</span>;
}

function Results({ message, colleges, onNavigate }: {
  message: AssistantMessage;
  colleges: College[] | null;
  onNavigate: () => void;
}) {
  const { bookmarks, toggle } = useBookmarks();
  const today = useToday();
  const opportunities = resolveOpportunityIds(message.opportunityIds ?? []);
  const collegeRows = colleges && message.collegeIds?.length ? resolveCollegeIds(message.collegeIds, colleges) : [];
  const count = opportunities.length + collegeRows.length;
  if (count === 0) return null;

  return (
    <section className="assistant-results" aria-label="Verified results">
      <p className="assistant-results-label">Verified in Pathfind · {count}</p>
      <ul>
        {opportunities.map((o) => {
          const saved = bookmarks.includes(o.id);
          return (
            <li key={o.id} className="assistant-result">
              <Link to={`/opportunities/${o.id}`} className="assistant-result-main" onClick={onNavigate}>
                <span className="assistant-result-title">{o.title}</span>
                <span className="assistant-result-org">{o.org} · {o.type}</span>
                <span className="assistant-result-meta">
                  <DeadlineMeta opportunity={o} today={today} />
                  {o.free && <span>Free</span>}
                  <span>Gr {o.minGrade === o.maxGrade ? o.minGrade : `${o.minGrade}–${o.maxGrade}`}</span>
                  <span>{o.city && o.state ? `${o.city}, ${o.state}` : o.location}</span>
                </span>
              </Link>
              <button
                type="button"
                className={`assistant-result-save${saved ? " is-saved" : ""}`}
                onClick={() => toggle(o.id)}
                aria-pressed={saved}
                aria-label={saved ? `Remove ${o.title} from saved` : `Save ${o.title}`}
              >
                <IconBookmark filled={saved} />
              </button>
            </li>
          );
        })}
        {collegeRows.map((c) => (
          <li key={c.id} className="assistant-result">
            <a
              className="assistant-result-main"
              href={c.website ? `https://${c.website}` : undefined}
              target="_blank"
              rel="noreferrer"
            >
              <span className="assistant-result-title">{c.name}</span>
              <span className="assistant-result-org">{describeCollege(c)}</span>
            </a>
            {c.website && <ArrowUpRight className="assistant-result-external" size={15} aria-hidden="true" />}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ChatList({ chats, onOpen, onDelete }: {
  chats: AssistantChat[];
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <ul className="assistant-chat-list">
      {chats.map((chat) => (
        <li key={chat.id}>
          <button type="button" className="assistant-chat-open" onClick={() => onOpen(chat.id)}>
            <span className="assistant-chat-title">{chat.title}</span>
            <span className="assistant-chat-date">{chatDate(chat.updatedAt)}</span>
          </button>
          <button
            type="button"
            className="assistant-icon-button assistant-chat-delete"
            onClick={() => onDelete(chat.id)}
            aria-label={`Delete chat: ${chat.title}`}
          >
            <Trash2 size={15} aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function AssistantDrawer() {
  const { isOpen, close, chats, activeChat, status, error, ask, retry, stop, newChat, openChat, deleteChat } =
    useAssistant();
  const [input, setInput] = useState("");
  const [view, setView] = useState<"chat" | "history">("chat");
  const [colleges, setColleges] = useState<College[] | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const stickToBottomRef = useRef(true);

  useEscapeToClose(isOpen, close);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (window.matchMedia("(pointer: fine)").matches) inputRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const messages = activeChat?.messages ?? [];
  const needsColleges = messages.some((m) => m.collegeIds?.length);
  useEffect(() => {
    if (needsColleges && !colleges) loadColleges().then(setColleges).catch(() => setColleges([]));
  }, [needsColleges, colleges]);

  // Follow the stream only while the student is already at the bottom, so scrolling up to
  // read an earlier answer isn't yanked away by incoming text.
  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (body && stickToBottomRef.current) body.scrollTop = body.scrollHeight;
  }, [messages, status, error]);

  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  const busy = status !== "idle";

  const submit = (text: string) => {
    if (!text.trim() || busy) return;
    stickToBottomRef.current = true;
    setView("chat");
    ask(text);
    setInput("");
  };

  const lastMessage = messages[messages.length - 1];
  const pendingReply = busy && lastMessage?.role === "assistant" ? lastMessage : null;
  const showProgress = busy && !(pendingReply?.text);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="assistant-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
        >
          <motion.div
            className="assistant-drawer"
            initial={prefersReducedMotion ? { opacity: 0 } : { x: "100%" }}
            animate={prefersReducedMotion ? { opacity: 1 } : { x: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { x: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Pathfind assistant"
          >
            <header className="assistant-header">
              {view === "history" ? (
                <button type="button" className="assistant-icon-button" onClick={() => setView("chat")} aria-label="Back to chat">
                  <ArrowLeft size={17} aria-hidden="true" />
                </button>
              ) : null}
              <h2 className="assistant-title">{view === "history" ? "Saved chats" : "Ask Pathfind"}</h2>
              <div className="assistant-header-actions">
                {view === "chat" && chats.length > 0 && (
                  <button type="button" className="assistant-icon-button" onClick={() => setView("history")} aria-label="Saved chats">
                    <History size={17} aria-hidden="true" />
                  </button>
                )}
                <button
                  type="button"
                  className="assistant-icon-button"
                  onClick={() => {
                    newChat();
                    setView("chat");
                    inputRef.current?.focus();
                  }}
                  aria-label="New chat"
                  disabled={view === "chat" && !activeChat}
                >
                  <SquarePen size={17} aria-hidden="true" />
                </button>
                <button type="button" className="assistant-icon-button" onClick={close} aria-label="Close assistant">
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
            </header>

            <div
              className="assistant-body"
              ref={bodyRef}
              onScroll={(e) => {
                const el = e.currentTarget;
                stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
              }}
            >
              {view === "history" ? (
                <div className="assistant-history">
                  {chats.length > 0 ? (
                    <ChatList
                      chats={chats}
                      onOpen={(id) => {
                        openChat(id);
                        setView("chat");
                      }}
                      onDelete={deleteChat}
                    />
                  ) : (
                    <p className="assistant-muted">No saved chats yet. Your questions show up here.</p>
                  )}
                  <p className="assistant-footnote">Chats are saved in this browser, up to the last 20.</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="assistant-empty">
                  <h3>What are you looking for?</h3>
                  <p className="assistant-muted">
                    I search Pathfind's verified programs and colleges, then tell you what fits.
                  </p>
                  <div className="assistant-suggestions">
                    {SUGGESTIONS.map((s) => (
                      <button key={s} type="button" className="assistant-suggestion" onClick={() => submit(s)}>
                        {s}
                      </button>
                    ))}
                  </div>
                  {chats.length > 0 && (
                    <div className="assistant-recent">
                      <div className="assistant-recent-head">
                        <span className="assistant-results-label">Recent</span>
                        {chats.length > 3 && (
                          <button type="button" className="assistant-text-button" onClick={() => setView("history")}>
                            View all
                          </button>
                        )}
                      </div>
                      <ChatList chats={chats.slice(0, 3)} onOpen={openChat} onDelete={deleteChat} />
                    </div>
                  )}
                </div>
              ) : (
                <div className="assistant-thread" aria-live="polite" aria-busy={busy}>
                  {messages.map((m) => (
                    <div key={m.id} className={`assistant-message assistant-message--${m.role}`}>
                      {m.text && (
                        <p>
                          {renderText(m.text)}
                          {m === pendingReply && <span className="assistant-caret" aria-hidden="true" />}
                        </p>
                      )}
                      {m.role === "assistant" && <Results message={m} colleges={colleges} onNavigate={close} />}
                    </div>
                  ))}
                  {showProgress && (
                    <p className="assistant-progress" role="status">
                      <span className="assistant-progress-dot" aria-hidden="true" />
                      {status === "searching" ? "Searching Pathfind…" : "Writing…"}
                    </p>
                  )}
                  {error && (
                    <div className="assistant-error" role="alert">
                      <span>{error.message}</span>
                      {error.canRetry && (
                        <button type="button" className="assistant-text-button" onClick={retry}>
                          Try again
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <form
              className="assistant-composer-wrap"
              onSubmit={(e) => {
                e.preventDefault();
                submit(input);
              }}
            >
              <div className="assistant-composer">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  maxLength={1000}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      submit(input);
                    }
                  }}
                  placeholder={messages.length ? "Ask a follow-up…" : "Ask about a program or deadline…"}
                  aria-label="Message the assistant"
                />
                {busy ? (
                  <button type="button" className="assistant-send" onClick={stop} aria-label="Stop answer">
                    <Square size={12} fill="currentColor" aria-hidden="true" />
                  </button>
                ) : (
                  <button type="submit" className="assistant-send" aria-label="Send" disabled={!input.trim()}>
                    <ArrowUp size={16} aria-hidden="true" />
                  </button>
                )}
              </div>
              <p className="assistant-footnote">Programs and deadlines come from Pathfind's verified list.</p>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
