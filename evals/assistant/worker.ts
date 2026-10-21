// Isolated process: capture Deno.serve, replace only external DB I/O, execute the real handler.
import { cases, TODAY } from './cases.mjs';
const c = cases.find(c => c.id === Deno.args[0]);
if (!c) throw new Error('Unknown evaluation case');
const nativeFetch = globalThis.fetch;
const NativeDate = Date;
globalThis.Date = class extends NativeDate {
  constructor(...args: any[]) { super(...(args.length ? args : [`${TODAY}T12:00:00Z`]) as [string]); }
  static override now() { return NativeDate.now(); }
} as DateConstructor;
for (const [key, value] of Object.entries({
  SUPABASE_URL: 'https://eval.invalid', SUPABASE_ANON_KEY: 'eval-anon',
  SUPABASE_SERVICE_ROLE_KEY: 'eval-service', RATE_LIMIT_SALT: 'evaluation-only',
})) Deno.env.set(key, value);
let handler: (req: Request) => Promise<Response>;
Object.defineProperty(Deno, 'serve', { value: (fn: typeof handler) => { handler = fn; } });
// Do not persist provider response bodies or errors, which can contain sensitive content.
console.log = () => {};
console.error = () => {};
const calls: { model: string; status: number; usage?: Record<string, number> }[] = [];
const rpcCalls: { name: string; args: Record<string, unknown> }[] = [];
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
globalThis.fetch = async (input, init) => {
  const url = new URL(String(input));
  if (url.hostname === 'generativelanguage.googleapis.com') {
    const model = url.pathname.split('/').pop()!.split(':')[0];
    if (c.fault === 'provider') return json({ error: 'injected upstream outage' }, 503);
    if (c.fault === 'provider-interrupted') return new Response(
      'data: {"candidates":[{"content":{"parts":[{"text":"Partial transport fixture."}]}}]}\n\ndata: {"error":{"code":503}}\n\n',
      { headers: { 'Content-Type': 'text/event-stream' } },
    );
    if (!Deno.env.get('GEMINI_API_KEY')) throw new Error('GEMINI_API_KEY is required');
    const call = { model, status: 0, usage: undefined as Record<string, number> | undefined };
    calls.push(call);
    const response = await nativeFetch(input, init);
    call.status = response.status;
    // Observe the same stream without replacing model output or generation settings.
    if (response.ok) {
      const text = await response.clone().text();
      for (const line of text.split('\n')) if (line.startsWith('data:')) {
        const chunk = JSON.parse(line.slice(5));
        if (chunk.usageMetadata) call.usage = chunk.usageMetadata;
      }
    }
    return response;
  }
  if (url.hostname !== 'eval.invalid') throw new Error(`Unexpected network host: ${url.hostname}`);
  const name = url.pathname.split('/').pop()!;
  if (url.pathname.includes('/rpc/')) {
    const args = JSON.parse(String(init?.body ?? '{}'));
    rpcCalls.push({ name, args });
    if (name === 'ai_consume_quota') return c.fault === 'quota' ? json({ message: 'injected quota failure' }, 500) : json(0);
    if (name === 'ai_acquire_slot') return json(c.fault !== 'busy');
    if (name === 'ai_release_slot') return json(null);
    if (name === 'search_colleges') return json([]);
    if (name !== 'search_opportunities') throw new Error(`Unexpected RPC: ${name}`);
    if (c.fault === 'catalog') return json({ message: 'injected catalog failure' }, 500);
    // Mirror the migration's hard filters; this is a DB fixture, not proof of deployed SQL.
    const rows = c.rows.filter(r => !r.inactive &&
      (args.p_grade == null || r.min_grade <= args.p_grade && r.max_grade >= args.p_grade) &&
      (!args.p_free_only || r.free) &&
      (!args.p_interests || r.interests.some(i => args.p_interests.includes(i))) &&
      (!args.p_types || args.p_types.includes(r.type)) &&
      (!args.p_terms?.length || args.p_terms.some((t: string) => `${r.title} ${r.org} ${r.description}`.toLowerCase().includes(t))) &&
      (args.p_closing_within_days == null || r.deadline && r.deadline >= TODAY && Date.parse(r.deadline) <= Date.parse(TODAY) + args.p_closing_within_days * 86400000));
    return json(rows.slice(0, args.p_limit));
  }
  if (name === 'opportunities') {
    const requested = url.searchParams.get('id') ?? '';
    const ids = requested.replace(/^in\.\(|\)$/g, '').split(',').map(id => id.replace(/^"|"$/g, ''));
    return json(c.rows.filter(r => !r.inactive && ids.includes(r.id)));
  }
  throw new Error(`Unexpected DB route: ${name}`);
};
await import('../../supabase/functions/assistant/index.ts');
const start = performance.now();
const response = await handler!(new Request('http://localhost/assistant', {
  method: 'POST', headers: { Origin: 'http://localhost:5173', 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: c.message, pathProfile: c.profile, contextOpportunityIds: c.pinned ? [c.rows[0]?.id ?? 'missing'] : [] }),
}));
const raw = await response.text();
const events = response.headers.get('Content-Type')?.includes('ndjson') ? raw.trim().split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];
const result = {
  status: response.status, text: events.length ? events.filter(e => e.type === 'delta').map(e => e.text).join('') : raw,
  ids: events.find(e => e.type === 'results')?.opportunityIds ?? [],
  errors: events.filter(e => e.type === 'error'), done: events.some(e => e.type === 'done'),
  calls, rpcCalls, latencyMs: performance.now() - start,
};
await Deno.stdout.write(new TextEncoder().encode(JSON.stringify(result)));
