import { supabase } from "./supabaseClient";
import type { PathProfile } from "./usePathProfile";

export interface AssistantHistoryMessage {
  role: "user" | "assistant";
  text: string;
}

/** One line of the edge function's NDJSON stream. */
export type AssistantEvent =
  | { type: "results"; opportunityIds: string[]; collegeIds: number[] }
  | { type: "delta"; text: string }
  | { type: "done" };

/** A failure with a message that is safe and useful to show the student as-is. */
export class AssistantError extends Error {
  readonly code: "rate_limited" | "busy" | "failed";
  constructor(message: string, code: AssistantError["code"]) {
    super(message);
    this.code = code;
  }
}

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assistant`;
const FALLBACK = "The assistant is unavailable right now. Try again in a moment.";

export async function streamAssistant(
  request: {
    message: string;
    history: AssistantHistoryMessage[];
    contextOpportunityIds?: string[];
    /** Guests only: their Build My Path answers and bookmarks from this device. */
    pathProfile?: PathProfile;
    savedOpportunityIds?: string[];
  },
  onEvent: (event: AssistantEvent) => void,
  signal: AbortSignal,
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY;

  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(request),
    signal,
  });

  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => null);
    const code = body?.error === "rate_limited" || body?.error === "busy" ? body.error : "failed";
    throw new AssistantError(typeof body?.message === "string" ? body.message : FALLBACK, code);
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    let newline: number;
    while ((newline = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line) onEvent(JSON.parse(line) as AssistantEvent);
    }
  }
}
