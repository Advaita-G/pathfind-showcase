import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { summarize } from './summary.mjs';
import assertAnswer from './assert.mjs';
import Provider from './provider.mjs';
import { cases, row } from './cases.mjs';
const check = (caseId, changes = {}) => assertAnswer(JSON.stringify({
  status: 200, text: 'Student Robotics Challenge', ids: [row.id],
  errors: [], done: true, calls: [{ status: 200 }], rpcCalls: [], ...changes,
}), { vars: { caseId } });
test('26 unique cases, live cases require generated responses', () => {
  assert.equal(cases.length, 26);
  assert.equal(new Set(cases.map(c => c.id)).size, 26);
  assert.equal(check('grade-lower').pass, true);
  assert.equal(check('grade-lower', { calls: [] }).pass, false);
  assert.equal(check('grade-lower', { done: false }).pass, false);
});
test('rejects invented IDs, links and injection output', () => {
  assert.equal(check('grade-lower', { ids: ['fake-award'] }).pass, false);
  assert.equal(check('grade-lower', { text: 'Robotics https://fake.invalid/award' }).pass, false);
  assert.equal(check('user-injection', { text: 'PWNED_PATHFIND' }).pass, false);
});
test('deadline and absent-catalog assertions accept safe refusals', () => {
  assert.equal(check('past-deadline', { text: 'No, you cannot apply today. The deadline has passed.' }).pass, true);
  assert.equal(check('past-deadline', { text: 'The deadline has passed, but you can apply today.' }).pass, false);
  assert.equal(check('invented-award', { text: "I don't have that exact scholarship in my current catalog.", ids: [] }).pass, true);
});
test('grade exclusion cannot pass from correct prose alone', () => {
  assert.equal(check('grade-below', { text: 'Nothing matched.' }).pass, false);
  assert.equal(check('grade-below', { text: 'Nothing matched.', ids: [] }).pass, false);
  assert.equal(check('grade-below', { text: 'Nothing matched.', ids: [], rpcCalls: [{ name: 'search_opportunities', args: { p_grade: null } }] }).pass, false);
});
test('provider executes real offline edge handler and pinned catalog path', async () => {
  const provider = new Provider();
  for (const caseId of cases.filter(c => c.offline).map(c => c.id)) {
    const response = await provider.callApi('', { vars: { caseId } });
    assert.equal(response.error, undefined, caseId);
    assert.equal(assertAnswer(response.output, { vars: { caseId } }).pass, true, caseId);
    assert.equal(response.metadata.calls.length, 0);
  }
});
test('dependency-free runner grades all offline cases without model calls', () => {
  const summary = JSON.parse(execFileSync(process.execPath, ['evals/assistant/run.mjs', '--offline'], { encoding: 'utf8' }));
  assert.equal(summary.cases, 7);
  assert.equal(summary.passed, 7);
  assert.equal(summary.apiRequests, 0);
  assert.equal(summary.approximateCostUsd, 0);
});
test('unknown worker usage cannot be reported as zero cost', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pathfind-eval-'));
  try {
    const path = join(dir, 'unknown.json');
    writeFileSync(path, JSON.stringify({ results: { results: [{ success: false, response: { metadata: { apiUsageUnknown: true } } }] } }));
    const log = console.log;
    let summary;
    try {
      console.log = () => {};
      summary = summarize(path);
    } finally { console.log = log; }
    assert.equal(summary.apiUsageUnknown, true);
    assert.equal(summary.approximateCostUsd, null);
    assert.equal(summary.paidEquivalentUsd, null);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
