import type { Page, Route } from "@playwright/test";

export interface ProfileRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  school: string | null;
  grade: number | null;
  graduation_year: number | null;
  city: string | null;
  state: string | null;
  bio: string | null;
  interests: string[];
  goals: string[];
  skills: string[];
  causes: string[];
  dream_colleges: string[];
  time_commitment: string | null;
  [key: string]: unknown;
}

export interface UserMeta {
  sub: string;
  email: string;
  given_name?: string;
  family_name?: string;
  [key: string]: unknown;
}

export interface SupabaseMockOptions {
  userMeta?: UserMeta;
  /** Initial profiles row (as the handle_new_user trigger + prior edits would have left it). */
  profile?: Partial<ProfileRow>;
  /** Fail all profile writes with this error message. */
  failProfileWritesWith?: string;
  /** Rows already saved server-side in opportunity_plans. */
  planRows?: [string, Record<string, unknown>][];
}

export interface SupabaseMockWorld {
  upsertLog: { table: string; payload: unknown }[];
  getProfileRow: () => ProfileRow;
  getSavedOpportunityIds: () => string[];
  /** Rows the mocked opportunity_plans table holds, keyed by opportunity_id. */
  planRows: Map<string, Record<string, unknown>>;
}

export const DEFAULT_META: UserMeta = {
  sub: "11111111-1111-1111-1111-111111111111",
  email: "student@example.com",
  given_name: "Testy",
  family_name: "McTestface",
};

export function makeProfileRow(overrides: Partial<ProfileRow> = {}): ProfileRow {
  return {
    id: DEFAULT_META.sub,
    first_name: null,
    last_name: null,
    school: null,
    grade: null,
    graduation_year: null,
    city: null,
    state: null,
    bio: null,
    interests: [],
    goals: [],
    skills: [],
    causes: [],
    dream_colleges: [],
    time_commitment: null,
    ...overrides,
  };
}

export async function installSupabaseMock(
  page: Page,
  options: SupabaseMockOptions = {},
): Promise<SupabaseMockWorld> {
  const meta = options.userMeta ?? DEFAULT_META;
  let row = makeProfileRow(options.profile ?? {});
  const upsertLog: { table: string; payload: unknown }[] = [];
  const savedOpportunityIds = new Set<string>();
  const planRows = new Map<string, Record<string, unknown>>(options.planRows ?? []);

  const user = {
    id: meta.sub,
    email: meta.email,
    user_metadata: { ...meta },
    app_metadata: { provider: "google" },
    aud: "authenticated",
    created_at: "2026-09-01T00:00:00Z",
  };

  const json = (route: Route, body: unknown, status = 200) =>
    route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

  await page.route(/\/rest\/v1\/profiles.*/, async (route) => {
    const method = route.request().method();

    if (method === "GET") return json(route, row);

    if (method === "PATCH" || method === "POST") {
      const payload = route.request().postDataJSON() as Record<string, unknown>;
      upsertLog.push({ table: "profiles", payload });
      if (options.failProfileWritesWith) {
        return json(route, { message: options.failProfileWritesWith, code: "42501" }, 403);
      }
      row = { ...row, ...payload };
      return json(route, [], 201);
    }

    return json(route, { message: "unexpected profiles method" }, 405);
  });

  await page.route(/\/rest\/v1\/saved_opportunities.*/, async (route) => {
    const method = route.request().method();
    if (method === "GET") return json(route, []);
    if (method === "POST" || method === "PATCH") {
      const body = route.request().postDataJSON();
      const rows = Array.isArray(body) ? body : [body];
      for (const r of rows as { opportunity_id?: string }[]) {
        if (r.opportunity_id) savedOpportunityIds.add(r.opportunity_id);
      }
    }
    if (method === "DELETE") {
      const url = new URL(route.request().url());
      const match = url.searchParams.get("opportunity_id");
      if (match) savedOpportunityIds.delete(match.replace(/^eq\./, ""));
    }
    return json(route, [], 201);
  });

  await page.route(/\/rest\/v1\/opportunity_plans.*/, async (route) => {
    const method = route.request().method();
    if (method === "GET") return json(route, [...planRows.values()]);
    if (method === "POST") {
      const body = route.request().postDataJSON();
      for (const r of (Array.isArray(body) ? body : [body]) as { opportunity_id: string }[]) {
        planRows.set(r.opportunity_id, { ...r, updated_at: new Date().toISOString() });
      }
    }
    if (method === "DELETE") {
      const match = new URL(route.request().url()).searchParams.get("opportunity_id");
      if (match) planRows.delete(match.replace(/^eq\./, ""));
    }
    return json(route, [], 201);
  });

  await page.route(/\/auth\/v1\/user$/, async (route) => json(route, user));
  await page.route(/\/auth\/v1\/token(\?.*)?$/, async (route) =>
    json(route, {
      access_token: "mock-access-token",
      token_type: "bearer",
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      refresh_token: "mock-refresh-token",
      user,
    }),
  );

  return {
    upsertLog,
    getProfileRow: () => row,
    getSavedOpportunityIds: () => [...savedOpportunityIds],
    planRows,
  };
}

/**
 * Seeds Supabase's localStorage session BEFORE app scripts run, so the app boots
 * authenticated without a real Google round-trip.
 */
export async function gotoWithSession(page: Page, path = "/", meta: UserMeta = DEFAULT_META) {
  await page.addInitScript(
    ({ storageKey, meta }) => {
      const now = Math.floor(Date.now() / 1000);
      const user = {
        id: meta.sub,
        email: meta.email,
        user_metadata: { ...meta },
        app_metadata: { provider: "google" },
        aud: "authenticated",
        created_at: "2026-09-01T00:00:00Z",
      };
      const session = {
        access_token: "mock-access-token",
        token_type: "bearer",
        expires_in: 3600,
        expires_at: now + 3600,
        refresh_token: "mock-refresh-token",
        user,
      };
      localStorage.setItem(storageKey, JSON.stringify(session));
    },
    { storageKey: "sb-zrhdivvmdifscqdjrhks-auth-token", meta },
  );
  await page.goto(path);
}

export async function gotoAnon(page: Page, path = "/") {
  await page.goto(path);
}
