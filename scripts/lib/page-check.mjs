/**
 * Polite, read-only page fetching for catalog verification.
 *
 * - Honors robots.txt (User-agent: * rules, longest-match Allow/Disallow). A disallowed page is
 *   reported as "blocked", never fetched.
 * - One request at a time per host with a pause between them, so no site is hammered.
 * - Never sends cookies or credentials, never retries around a 403/429/CAPTCHA — those come back
 *   as-is and the record simply stays unverified.
 * - Pages that render their text with JavaScript can be read through Jina Reader (the web channel
 *   installed with Agent Reach), but only after robots.txt has allowed the page.
 */

const USER_AGENT = "PathfindCatalogCheck/1.0 (+https://www.getpathfind.com; verifying student opportunity listings)";
const HOST_DELAY_MS = 1200;
const TIMEOUT_MS = 20000;

const robotsCache = new Map();
const hostQueues = new Map();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Serializes requests per host so each site sees at most one request every HOST_DELAY_MS. */
function onHostQueue(host, task) {
  const previous = hostQueues.get(host) ?? Promise.resolve();
  const next = previous.then(async () => {
    try {
      return await task();
    } finally {
      await sleep(HOST_DELAY_MS);
    }
  });
  hostQueues.set(host, next.catch(() => {}));
  return next;
}

async function rawFetch(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": USER_AGENT, accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5" },
    });
    const body = await response.text();
    return { status: response.status, finalUrl: response.url, body };
  } catch (error) {
    return { status: 0, finalUrl: url, body: "", error: error.name === "AbortError" ? "timeout" : error.message };
  } finally {
    clearTimeout(timer);
  }
}

/** Parses the `User-agent: *` group of a robots.txt into allow/disallow path prefixes. */
export function parseRobots(text) {
  const rules = [];
  let applies = false;
  let sawRule = false;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, "").trim();
    const match = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!match) continue;
    const field = match[1].toLowerCase();
    const value = match[2].trim();
    if (field === "user-agent") {
      // A new group starts once rules have been seen; consecutive user-agent lines share a group.
      if (sawRule) {
        applies = false;
        sawRule = false;
      }
      if (value === "*") applies = true;
    } else if (field === "allow" || field === "disallow") {
      sawRule = true;
      if (applies && value) rules.push({ allow: field === "allow", path: value });
    }
  }
  return rules;
}

function ruleMatches(rulePath, path) {
  const pattern = rulePath
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\\\$$/, "$");
  return new RegExp(`^${pattern}`).test(path);
}

/** True when robots rules permit `path`. Longest matching rule wins; Allow wins ties. */
export function robotsAllowsPath(rules, path) {
  let best = null;
  for (const rule of rules) {
    if (!ruleMatches(rule.path, path)) continue;
    if (!best || rule.path.length > best.path.length || (rule.path.length === best.path.length && rule.allow)) {
      best = rule;
    }
  }
  return best ? best.allow : true;
}

export async function robotsAllows(url) {
  const { origin, pathname, search } = new URL(url);
  if (!robotsCache.has(origin)) {
    const response = await onHostQueue(new URL(url).host, () => rawFetch(`${origin}/robots.txt`));
    // A missing robots.txt allows everything; an unreachable one (5xx) is treated as "disallow".
    const rules =
      response.status >= 500 || response.status === 0
        ? [{ allow: false, path: "/" }]
        : response.status >= 400
          ? []
          : parseRobots(response.body);
    robotsCache.set(origin, rules);
  }
  return robotsAllowsPath(robotsCache.get(origin), `${pathname}${search}`);
}

/** Visible text of an HTML document, whitespace-collapsed. Good enough for quote matching. */
export function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|div|li|h[1-6]|tr|section)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&#x27;|&rsquo;|&lsquo;|&#8217;|&#8216;/gi, "'")
    .replace(/&ldquo;|&rdquo;|&#8220;|&#8221;/gi, '"')
    .replace(/&ndash;|&mdash;|&#8211;|&#8212;/gi, "-")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&[a-z]+;/gi, " ")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

/** Loose comparable form: case, quotes, dashes, and whitespace differences never fail a match. */
export function comparable(text) {
  return String(text)
    .toLowerCase()
    .replace(/[‘’‚‛`´]/g, "'")
    .replace(/[“”„]/g, '"')
    .replace(/[‐-―−]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

export function quoteFound(pageText, quote) {
  const needle = comparable(quote);
  return needle.length > 0 && comparable(pageText).includes(needle);
}

/**
 * Fetches a page's text if robots.txt allows it. Returns
 * `{ url, status, finalUrl, text, blocked, error, via }`. `via` is "direct" or "reader".
 */
export async function fetchPageText(url, { reader = true } = {}) {
  const host = new URL(url).host;
  if (!(await robotsAllows(url))) {
    return { url, status: null, finalUrl: url, text: "", blocked: true, via: null };
  }
  const direct = await onHostQueue(host, () => rawFetch(url));
  let text = direct.status >= 200 && direct.status < 400 ? htmlToText(direct.body) : "";
  let via = "direct";

  // JS-rendered pages come back nearly empty. Jina Reader renders them; it is only consulted
  // after the site's own robots.txt allowed the page, and never for a 4xx/5xx page.
  if (reader && direct.status >= 200 && direct.status < 400 && text.length < 1500) {
    const rendered = await onHostQueue("r.jina.ai", () => rawFetch(`https://r.jina.ai/${url}`));
    if (rendered.status === 200 && rendered.body.length > text.length) {
      text = rendered.body.replace(/\s+/g, " ");
      via = "reader";
    }
  }

  return { url, status: direct.status, finalUrl: direct.finalUrl, text, blocked: false, error: direct.error, via };
}

/** Runs `worker` over `items` with at most `limit` in flight (per-host pacing still applies). */
export async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}
