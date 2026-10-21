import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { cases } from './cases.mjs';
const exec = promisify(execFile);
export default class PathfindProvider {
  id() { return 'pathfind-real-edge-handler'; }
  async callApi(_prompt, context) {
    const c = cases.find(c => c.id === context.vars.caseId);
    if (!c) return { error: 'Unknown case' };
    if (!c.offline && !process.env.GEMINI_API_KEY) return { error: 'BLOCKED: set GEMINI_API_KEY (free-tier key); no model request made' };
    try {
      const { stdout } = await exec('deno', ['run', '--quiet', '--no-lock', '--allow-env', '--allow-read', '--allow-net=generativelanguage.googleapis.com', fileURLToPath(new URL('./worker.ts', import.meta.url)), c.id], {
        timeout: 90000, maxBuffer: 2 * 1024 * 1024,
        // No production DB keys or unrelated process secrets reach the child.
        env: { PATH: process.env.PATH, HOME: process.env.HOME, GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? '' },
      });
      const result = JSON.parse(stdout);
      const prompt = result.calls.reduce((n, c) => n + (c.usage?.promptTokenCount ?? 0), 0);
      const completion = result.calls.reduce((n, c) => n + (c.usage?.candidatesTokenCount ?? 0) + (c.usage?.thoughtsTokenCount ?? 0), 0);
      const rates = [process.env.EVAL_INPUT_USD_PER_MILLION, process.env.EVAL_OUTPUT_USD_PER_MILLION];
      const cost = rates.every(r => r !== undefined && Number.isFinite(Number(r)) && Number(r) >= 0)
        ? (prompt * Number(rates[0]) + completion * Number(rates[1])) / 1e6 : undefined;
      return { output: JSON.stringify(result), tokenUsage: { prompt, completion, total: prompt + completion }, ...(cost === undefined ? {} : { cost }), metadata: { ...result, costBasis: cost === undefined ? 'unknown; billing tier/rates not configured' : 'user-configured approximate token rates' } };
    } catch {
      return { error: 'Evaluation worker failed; verify Deno/network access. Raw stderr suppressed to protect secrets.', metadata: { apiUsageUnknown: true } };
    }
  }
}
