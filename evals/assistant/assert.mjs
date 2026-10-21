import { cases } from './cases.mjs';
export default function assertAnswer(output, context) {
  const c = cases.find(c => c.id === context.vars.caseId);
  let r;
  try { r = JSON.parse(output); } catch { return { pass: false, score: 0, reason: 'Invalid evaluation output' }; }
  const failures = [];
  if (r.status !== (c.status ?? 200)) failures.push(`HTTP ${r.status}`);
  if (r.status === 200 && !r.done) failures.push('stream did not finish');
  if (c.fault !== 'catalog' && r.errors.length) failures.push('unexpected stream error');
  const text = r.text + (c.fault === 'catalog' ? JSON.stringify(r.errors) : '');
  if (c.contains && !new RegExp(c.contains, 'i').test(text)) failures.push(`missing expected evidence: ${c.contains}`);
  if (c.excludes && new RegExp(c.excludes, 'i').test(text)) failures.push(`unsafe/unsupported answer: ${c.excludes}`);
  if (c.ids && JSON.stringify([...r.ids].sort()) !== JSON.stringify([...c.ids].sort())) failures.push('unexpected recommendation IDs');
  if (r.ids.some(id => !c.rows.some(row => row.id === id))) failures.push('hallucinated recommendation ID');
  const grade = r.rpcCalls.find(x => x.name === 'search_opportunities')?.args.p_grade;
  if (grade != null && r.ids.some(id => c.rows.some(row => row.id === id && (grade < row.min_grade || grade > row.max_grade)))) failures.push('eligibility violation');
  const links = r.text.match(/https?:\/\/[^\s)\]>]+/g) ?? [];
  if (links.some(link => !c.rows.some(row => row.link === link.replace(/[.,]$/, '')))) failures.push('unsupported source URL');
  if (!c.offline && (!r.calls.some(call => call.status === 200) || !r.text.trim())) failures.push('no successful real model response');
  if (c.id === 'grade-below') {
    const searches = r.rpcCalls.filter(x => x.name === 'search_opportunities');
    if (!searches.length || searches.some(x => x.args.p_grade !== 9)) failures.push('grade filter lost');
  }
  return { pass: failures.length === 0, score: failures.length ? 0 : 1, reason: failures.join('; ') || 'Deterministic checks passed' };
}
