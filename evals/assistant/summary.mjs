import { readFileSync, writeFileSync } from 'node:fs';
export function summarize(path) {
  const data = JSON.parse(readFileSync(path, 'utf8'));
  const results = data.results.results;
  const calls = results.flatMap(r => r.response?.metadata?.calls ?? []);
  const apiUsageUnknown = results.some(r => r.response?.metadata?.apiUsageUnknown);
  // Published standard text rates; this is a reference estimate, not account billing.
  // https://ai.google.dev/gemini-api/docs/generate-content/whats-new-gemini-3.6
  const rates = { 'gemini-3.5-flash-lite': [0.30, 2.50], 'gemini-3.6-flash': [1.50, 7.50] };
  const pricedCalls = calls.filter(c => c.status === 200);
  const paidEquivalentUsd = !apiUsageUnknown && pricedCalls.every(c => c.usage && rates[c.model])
    ? pricedCalls.reduce((n,c) => n + ((c.usage.promptTokenCount ?? 0) * rates[c.model][0] +
      ((c.usage.candidatesTokenCount ?? 0) + (c.usage.thoughtsTokenCount ?? 0)) * rates[c.model][1]) / 1e6, 0) : null;
  const latency = results.map(r => r.response?.metadata?.latencyMs).filter(Number.isFinite).sort((a,b) => a-b);
  const failures = results.filter(r => !r.success).map(r => ({ case: r.description ?? r.testCase?.description, reason: r.error ?? r.gradingResult?.reason }));
  const category = name => results.filter(r => (r.testCase?.metadata ?? r.metadata)?.category === name);
  const summary = {
    cases: results.length, passed: results.filter(r => r.success).length,
    passRate: results.filter(r => r.success).length / results.length,
    eligibilityCasesEvaluated: category('eligibility').length,
    eligibilityCheckFailures: category('eligibility').length ? category('eligibility').filter(r => !r.success).length : null,
    hallucinationCasesEvaluated: category('hallucination').length,
    hallucinationCheckFailures: category('hallucination').length ? category('hallucination').filter(r => !r.success).length : null,
    eligibilityViolationsDetected: results.filter(r => /eligibility violation/.test(r.gradingResult?.reason ?? '')).length,
    groundingViolationsDetected: results.filter(r => /hallucinated recommendation ID|unsupported source URL/.test(r.gradingResult?.reason ?? '')).length,
    metricLimit: 'Category check failures are signals, not a complete semantic hallucination/eligibility audit.',
    apiRequests: calls.length, apiStatuses: calls.map(c => c.status), models: [...new Set(calls.map(c => c.model))],
    apiUsageUnknown,
    promptTokens: calls.reduce((n,c) => n + (c.usage?.promptTokenCount ?? 0), 0),
    outputAndThoughtTokens: calls.reduce((n,c) => n + (c.usage?.candidatesTokenCount ?? 0) + (c.usage?.thoughtsTokenCount ?? 0), 0),
    latencyMs: { p50: latency[Math.floor(latency.length * .5)] ?? null, p95: latency[Math.min(latency.length-1, Math.floor(latency.length * .95))] ?? null },
    approximateCostUsd: apiUsageUnknown ? null : calls.length === 0 ? 0 : results.every(r => r.response?.cost !== undefined) ? results.reduce((n,r) => n + r.response.cost, 0) : null,
    paidEquivalentUsd,
    billingNote: 'User confirmed the key is on the Gemini free tier; actual account billing was not independently inspected.',
    failures,
  };
  writeFileSync(path.replace(/\.json$/, '-summary.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify(summary, null, 2));
  return summary;
}
