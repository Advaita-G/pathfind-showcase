import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Provider from './provider.mjs';
import assertAnswer from './assert.mjs';
import { tests, cases } from './cases.mjs';
import { summarize } from './summary.mjs';
if (existsSync('.env.eval.local')) process.loadEnvFile('.env.eval.local');
const offline = process.argv.includes('--offline');
if (!offline && !process.env.GEMINI_API_KEY) {
  console.error('BLOCKED: set GEMINI_API_KEY in your shell or ignored .env.eval.local (free-tier project). Use npm run eval:assistant:offline for real handler failure/routing checks without inference.');
  process.exit(2);
}
mkdirSync('evals/assistant/results', { recursive: true });
const output = resolve(`evals/assistant/results/${offline ? 'offline' : 'live'}.json`);
const provider = new Provider();
const results = [];
for (const testCase of tests.filter(t => !offline || cases.find(c => c.id === t.vars.caseId).offline)) {
  const response = await provider.callApi('', { vars: testCase.vars });
  const gradingResult = response.error
    ? { pass: false, score: 0, reason: response.error }
    : assertAnswer(response.output, { vars: testCase.vars });
  results.push({ testCase, response, gradingResult, success: gradingResult.pass });
  // Save each result so an interrupted live run retains its completed evidence and usage.
  writeFileSync(output, JSON.stringify({ results: { results } }, null, 2) + '\n');
}
const summary = summarize(output);
process.exit(summary.passed === summary.cases ? 0 : 1);
