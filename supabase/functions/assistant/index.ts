// Pathfind AI assistant. Explains and personalizes Pathfind's real opportunity/college data —
// never invents it. One request = deterministic intent routing (intent.ts) → at most one catalog
// lookup (only for search/advice) → at most one streamed model call. Unclear messages and
// greetings get a fixed reply with no model call. Grade eligibility is a hard filter in
// search_opportunities.
//
// Response is NDJSON: {"type":"results",...} first, then {"type":"delta","text"} chunks, then
// {"type":"done"}. Rate limits and the one-request-at-a-time lock are enforced here and in
// service-role-only SQL functions; nothing on the client is trusted.
import { createClient } from "npm:@supabase/supabase-js@2";
import { parseIntent, type Intent } from "./intent.ts";
import { buildSystemPrompt, taskBlock, type CollegeRow, type OpportunityRow, type StudentContext } from "./prompt.ts";
import { streamAnswer, type Turn } from "./provider.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const RATE_LIMIT_SALT = Deno.env.get("RATE_LIMIT_SALT");

function envInt(name: string, fallback: number): number {
  const value = Number(Deno.env.get(name));
  return Number.isInteger(value) && value > 0 ? value : fallback;
}
const LIMITS = {
  anonMinute: envInt("AI_LIMIT_ANON_MINUTE", 5),
  anonDay: envInt("AI_LIMIT_ANON_DAY", 8),
  userMinute: envInt("AI_LIMIT_USER_MINUTE", 8),
  userDay: envInt("AI_LIMIT_USER_DAY", 25),
  // Caps signed-in usage per network so one IP can't farm many free accounts.
  ipDay: envInt("AI_LIMIT_IP_DAY", 60),
  globalDay: envInt("AI_LIMIT_GLOBAL_DAY", 500),
};

const MAX_BODY_BYTES = 12_000;
const MAX_MESSAGE_CHARS = 1000;
const MAX_HISTORY = 6;
const MAX_HISTORY_CHARS = 1500;
const MAX_CONTEXT_IDS = 6;
const MAX_LIST_ITEMS = 20;
const MAX_ITEM_CHARS = 80;
const ID_PATTERN = /^[a-z0-9-]{1,100}$/i;

const ALLOWED_ORIGINS = new Set([
  "https://www.getpathfind.com",
  "https://getpathfind.com",
  "http://localhost:5173",
  "http://localhost:4173",
]);

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function jsonResponse(body: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

async function hmac(value: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(salt),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * The left end of x-forwarded-for is whatever the caller sent, so it's never used — that was a
 * limiter bypass. Prefer headers the platform proxy sets, else the proxy-appended right end.
 */
function clientIp(req: Request): string {
  return req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",").pop()?.trim() ??
    "unknown";
}

const LIMIT_MESSAGES = {
  minute: "You're sending messages quickly. Wait a minute, then try again.",
  anonDay: "You've used today's free questions. Sign in to get more, or come back tomorrow.",
  userDay: "You've used today's questions. Come back tomorrow.",
  global: "The assistant is at capacity for today. Try again tomorrow.",
};

interface Quota {
  keys: string[];
  windows: string[];
  limits: number[];
  messages: string[];
}

function quotaFor(userId: string | null, ipHash: string): Quota {
  if (userId) {
    return {
      keys: [`user:${userId}:minute`, `user:${userId}:day`, `ipu:${ipHash}:day`, "global:day"],
      windows: ["minute", "day", "day", "day"],
      limits: [LIMITS.userMinute, LIMITS.userDay, LIMITS.ipDay, LIMITS.globalDay],
      messages: [LIMIT_MESSAGES.minute, LIMIT_MESSAGES.userDay, LIMIT_MESSAGES.userDay, LIMIT_MESSAGES.global],
    };
  }
  return {
    keys: [`anon:${ipHash}:minute`, `anon:${ipHash}:day`, "global:day"],
    windows: ["minute", "day", "day"],
    limits: [LIMITS.anonMinute, LIMITS.anonDay, LIMITS.globalDay],
    messages: [LIMIT_MESSAGES.minute, LIMIT_MESSAGES.anonDay, LIMIT_MESSAGES.global],
  };
}

interface Payload {
  message: string;
  history: Turn[];
  contextIds: string[];
  /** A guest's own Build My Path answers and bookmarks from this device. Ignored when signed in. */
  guest: { profile: Record<string, unknown> | null; savedIds: string[] };
}

function ids(value: unknown, max: number): string[] {
  return Array.isArray(value)
    ? value.filter((id): id is string => typeof id === "string" && ID_PATTERN.test(id)).slice(0, max)
    : [];
}

function textList(value: unknown): string[] {
  return Array.isArray(value)
    ? value
      .filter((v): v is string => typeof v === "string")
      .map((v) => v.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, MAX_ITEM_CHARS))
      .filter(Boolean)
      .slice(0, MAX_LIST_ITEMS)
    : [];
}

function parsePayload(raw: string): Payload | string {
  let body: {
    message?: unknown;
    history?: unknown;
    contextOpportunityIds?: unknown;
    pathProfile?: unknown;
    savedOpportunityIds?: unknown;
  };
  try {
    body = JSON.parse(raw);
  } catch {
    return "Invalid JSON body";
  }
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message || message.length > MAX_MESSAGE_CHARS) {
    return `Message must be 1-${MAX_MESSAGE_CHARS} characters`;
  }
  const history: Turn[] = Array.isArray(body.history)
    ? body.history
      .filter((m): m is { role: string; text: string } =>
        !!m && (m.role === "user" || m.role === "assistant") && typeof m.text === "string"
      )
      .slice(-MAX_HISTORY)
      .map((m) => ({ role: m.role === "user" ? "user" : "model", text: m.text.slice(0, MAX_HISTORY_CHARS) }))
    : [];
  // Gemini expects the conversation to open with a user turn.
  while (history[0]?.role === "model") history.shift();
  const profile = body.pathProfile && typeof body.pathProfile === "object"
    ? body.pathProfile as Record<string, unknown>
    : null;
  return {
    message,
    history,
    contextIds: ids(body.contextOpportunityIds, MAX_CONTEXT_IDS),
    guest: { profile, savedIds: ids(body.savedOpportunityIds, MAX_LIST_ITEMS) },
  };
}

async function titlesFor(savedIds: string[]): Promise<string[]> {
  if (!savedIds.length) return [];
  const { data } = await admin.from("opportunities").select("title").in("id", savedIds);
  return (data ?? []).map((o: { title: string }) => o.title);
}

function hasAnything(s: StudentContext): boolean {
  return !!(s.grade || s.school || s.interests.length || s.goals.length || s.skills.length ||
    s.causes.length || s.dreamColleges.length || s.timeCommitment || s.bio || s.savedOpportunityIds.length);
}

/** The signed-in student's own profile (RLS-scoped client) and saved opportunities. */
async function loadStudent(
  client: typeof admin,
  userId: string,
): Promise<StudentContext | null> {
  const [{ data: profile }, { data: saved }] = await Promise.all([
    client
      .from("profiles")
      .select(
        "first_name, school, grade, graduation_year, city, state, bio, interests, goals, skills, causes, dream_colleges, time_commitment",
      )
      .eq("id", userId)
      .maybeSingle(),
    client.from("saved_opportunities").select("opportunity_id").eq("user_id", userId).limit(MAX_LIST_ITEMS),
  ]);
  const savedIds = (saved ?? []).map((r: { opportunity_id: string }) => r.opportunity_id);
  const student: StudentContext = {
    source: "profile",
    firstName: profile?.first_name ?? null,
    school: profile?.school ?? null,
    grade: profile?.grade ?? null,
    graduationYear: profile?.graduation_year ?? null,
    location: [profile?.city, profile?.state].filter(Boolean).join(", ") || null,
    bio: profile?.bio ? String(profile.bio).slice(0, 300) : null,
    interests: profile?.interests ?? [],
    goals: profile?.goals ?? [],
    skills: profile?.skills ?? [],
    causes: profile?.causes ?? [],
    dreamColleges: profile?.dream_colleges ?? [],
    timeCommitment: profile?.time_commitment ?? null,
    savedOpportunityIds: savedIds,
    savedOpportunityTitles: await titlesFor(savedIds),
  };
  return hasAnything(student) ? student : null;
}

/** A guest's Build My Path answers and bookmarks, sent from their own device. */
async function guestStudent(guest: Payload["guest"]): Promise<StudentContext | null> {
  const p = guest.profile ?? {};
  const time = typeof p.timeCommitment === "string" ? p.timeCommitment.slice(0, 40) : null;
  const student: StudentContext = {
    source: "device",
    firstName: null,
    school: null,
    grade: null,
    graduationYear: null,
    location: null,
    bio: null,
    interests: textList(p.interests),
    goals: textList(p.goals),
    skills: textList(p.skills),
    causes: textList(p.causes),
    dreamColleges: textList(p.colleges),
    timeCommitment: time,
    savedOpportunityIds: guest.savedIds,
    savedOpportunityTitles: await titlesFor(guest.savedIds),
  };
  return hasAnything(student) ? student : null;
}

async function searchOpportunities(
  intent: Intent,
  student: StudentContext | null,
  loosen = true,
): Promise<OpportunityRow[]> {
  const useProfileInterests = intent.interests.length === 0 && intent.terms.length === 0 &&
    !!student?.interests.length;
  const base = {
    p_terms: intent.terms.length ? intent.terms : null,
    p_interests: intent.interests.length ? intent.interests : useProfileInterests ? student!.interests : null,
    p_grade: intent.grade ?? student?.grade ?? null,
    p_types: intent.types.length ? intent.types : null,
    p_free_only: intent.freeOnly,
    p_closing_within_days: intent.closingWithinDays,
    p_limit: 6,
  };
  // Loosen once or twice rather than show nothing: drop leftover free-text terms when a topic
  // was recognized, then drop interests that came from the profile rather than the message.
  const attempts = [base];
  if (base.p_terms && (base.p_interests || base.p_types)) attempts.push({ ...base, p_terms: null });
  if (useProfileInterests && loosen) attempts.push({ ...base, p_interests: null });

  for (const args of attempts) {
    const { data, error } = await admin.rpc("search_opportunities", args);
    if (error) throw error;
    if (data?.length) return data;
  }
  return [];
}

async function opportunitiesById(idList: string[]): Promise<OpportunityRow[]> {
  if (!idList.length) return [];
  const { data, error } = await admin.from("opportunities").select("*").in("id", idList).eq("inactive", false);
  if (error) throw error;
  return data ?? [];
}

/** One directory lookup per name (search_colleges ANDs its terms), best match each. */
async function collegesNamed(names: string[]): Promise<CollegeRow[]> {
  const found = await Promise.all(names.map(async (name) => {
    const terms = name.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 2).slice(0, 5);
    if (!terms.length) return [];
    const { data, error } = await admin.rpc("search_colleges", { p_terms: terms, p_limit: names.length > 1 ? 1 : 6 });
    if (error) throw error;
    return (data ?? []) as CollegeRow[];
  }));
  const seen = new Set<number>();
  return found.flat().filter((c) => !seen.has(c.id) && seen.add(c.id));
}

const GREETING_REPLY =
  "Hi! Ask me for programs (\"free robotics competitions for 10th grade\"), about colleges, " +
  "or what to work on next based on your Pathfind profile.";
const UNCLEAR_REPLY =
  "I'm not sure what you meant by that. Try asking me about colleges, opportunities, or your Pathfind plan, " +
  "like \"free coding programs for 10th grade\" or \"what should I work on this semester?\"";

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin") ?? "";
  if (!ALLOWED_ORIGINS.has(origin)) return new Response("Forbidden", { status: 403 });
  const cors = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405, cors);
  if (!RATE_LIMIT_SALT) {
    console.error("RATE_LIMIT_SALT is not set; refusing to run without rate limiting");
    return jsonResponse({ error: "The assistant is unavailable right now." }, 503, cors);
  }

  const started = Date.now();
  const raw = await req.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
    return jsonResponse({ error: "Request too large" }, 413, cors);
  }
  const payload = parsePayload(raw);
  if (typeof payload === "string") return jsonResponse({ error: payload }, 400, cors);

  const intent = parseIntent(payload.message);
  const stream = (write: (emit: (line: unknown) => void, signal: AbortSignal) => Promise<void>, onEnd?: () => void) => {
    const abort = new AbortController();
    req.signal.addEventListener("abort", () => abort.abort());
    const encoder = new TextEncoder();
    return new Response(
      new ReadableStream({
        async start(controller) {
          const emit = (line: unknown) => controller.enqueue(encoder.encode(JSON.stringify(line) + "\n"));
          try {
            await write(emit, abort.signal);
          } catch (error) {
            if (!abort.signal.aborted) {
              console.error("assistant stream error:", error);
              emit({ type: "delta", text: "The assistant is unavailable right now. Try again shortly." });
            }
          } finally {
            onEnd?.();
            try {
              emit({ type: "done" });
              controller.close();
            } catch { /* client already gone */ }
          }
        },
        cancel() {
          abort.abort();
        },
      }),
      { headers: { ...cors, "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" } },
    );
  };

  // Greetings and unclear messages are a fixed reply: no search, no model call, no quota spent.
  if ((intent.kind === "greeting" || intent.kind === "unclear") && payload.contextIds.length === 0) {
    return stream(async (emit) => {
      emit({ type: "results", opportunityIds: [], collegeIds: [] });
      emit({ type: "delta", text: intent.kind === "greeting" ? GREETING_REPLY : UNCLEAR_REPLY });
    });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  // verify_jwt is off (the publishable key isn't a JWT), so the session JWT is verified here.
  // Guests send the publishable key, which never resolves to a user.
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const user = token.startsWith("eyJ") && token !== SUPABASE_ANON_KEY
    ? (await userClient.auth.getUser(token).catch(() => ({ data: { user: null } }))).data.user
    : null;

  const ipHash = await hmac(clientIp(req), RATE_LIMIT_SALT);
  const identifier = user ? `user:${user.id}` : `anon:${ipHash}`;
  const quota = quotaFor(user?.id ?? null, ipHash);

  const [quotaResult, student] = await Promise.all([
    admin.rpc("ai_consume_quota", { p_keys: quota.keys, p_windows: quota.windows, p_limits: quota.limits }),
    // Signed-in students always use their own stored profile; client-sent guest data is ignored.
    (user ? loadStudent(userClient, user.id) : guestStudent(payload.guest)).catch(() => null),
  ]);
  if (quotaResult.error) {
    console.error("quota check failed:", quotaResult.error.message);
    return jsonResponse({ error: "The assistant is unavailable right now. Try again shortly." }, 503, cors);
  }
  if (quotaResult.data > 0) {
    const exceeded = quota.windows[quotaResult.data - 1];
    return jsonResponse(
      { error: "rate_limited", message: quota.messages[quotaResult.data - 1] },
      429,
      { ...cors, "Retry-After": exceeded === "minute" ? "60" : "3600" },
    );
  }

  const { data: gotSlot, error: slotError } = await admin.rpc("ai_acquire_slot", { p_identifier: identifier });
  if (slotError || !gotSlot) {
    if (slotError) console.error("slot acquire failed:", slotError.message);
    return jsonResponse(
      { error: "busy", message: "Still working on your last question. Wait for it to finish." },
      429,
      { ...cors, "Retry-After": "5" },
    );
  }
  const releaseSlot = () => {
    admin.rpc("ai_release_slot", { p_identifier: identifier }).then(({ error }) => {
      if (error) console.error("slot release failed:", error.message);
    });
  };

  return stream(async (emit, signal) => {
    const today = new Date().toISOString().slice(0, 10);
    let opportunities: OpportunityRow[] = [];
    let colleges: CollegeRow[] = [];

    if (payload.contextIds.length) {
      opportunities = await opportunitiesById(payload.contextIds);
    } else if (intent.kind === "search" && intent.target === "colleges") {
      colleges = await collegesNamed(intent.terms.length ? [intent.terms.join(" ")] : []);
    } else if (intent.kind === "search") {
      opportunities = await searchOpportunities(intent, student);
    } else if (intent.kind === "advice" && intent.target === "saved") {
      opportunities = await opportunitiesById(student?.savedOpportunityIds.slice(0, 10) ?? []);
    } else if (intent.kind === "advice" && intent.target === "colleges") {
      colleges = await collegesNamed(student?.dreamColleges.slice(0, 5) ?? []);
    } else if (intent.kind === "advice" && student?.interests.length) {
      // Advice only attaches programs that match the student's own interests, never filler.
      opportunities = await searchOpportunities({ ...intent, terms: [] }, student, false);
    }
    const searchedAt = Date.now();
    emit({ type: "results", opportunityIds: opportunities.map((o) => o.id), collegeIds: colleges.map((c) => c.id) });

    let firstTokenAt = 0;
    try {
      const turns: Turn[] = [
        ...payload.history,
        {
          role: "user",
          text: `${payload.message}\n\n${
            taskBlock(intent, {
              opportunities,
              colleges,
              pinned: payload.contextIds.length > 0,
              hasProfile: !!student,
            }, today)
          }`,
        },
      ];
      for await (const text of streamAnswer(GEMINI_API_KEY, buildSystemPrompt(student, today), turns, signal)) {
        firstTokenAt ||= Date.now();
        emit({ type: "delta", text });
      }
    } catch (error) {
      if (signal.aborted && req.signal.aborted) return;
      console.error("model call failed:", error instanceof Error ? error.message : error);
      if (!firstTokenAt) {
        emit({
          type: "delta",
          text: opportunities.length || colleges.length
            ? "I couldn't write a summary just now, but these results come straight from Pathfind's catalog."
            : "I couldn't reach the AI just now. Try again in a minute.",
        });
      } else {
        emit({ type: "delta", text: "\n\nThis answer was interrupted. Please try again." });
      }
    } finally {
      console.log(JSON.stringify({
        kind: intent.kind,
        target: intent.target,
        signedIn: !!user,
        results: opportunities.length + colleges.length,
        msSearch: searchedAt - started,
        msFirstToken: firstTokenAt ? firstTokenAt - started : null,
        msTotal: Date.now() - started,
      }));
    }
  }, releaseSlot);
});
