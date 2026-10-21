import { expect, test, type Page } from "@playwright/test";

const SITE = "https://www.getpathfind.com";

/** Vercel injects these from the edge; the local static server can't serve them. */
const IGNORED_REQUESTS = [/\/_vercel\/(insights|speed-insights)/];

function collectErrors(page: Page) {
  const errors: string[] = [];
  const ignored = (text: string) => IGNORED_REQUESTS.some((pattern) => pattern.test(text));

  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    // React logs hydration mismatches through this channel, so keep it. The generic
    // "Failed to load resource" line is redundant with the response listener below,
    // which records the URL.
    if (text.includes("Failed to load resource") || ignored(text)) return;
    errors.push(`console.error: ${text}`);
  });
  page.on("response", (response) => {
    if (response.status() < 400) return;
    const url = response.url();
    if (ignored(url)) return;
    errors.push(`http ${response.status()}: ${url}`);
  });
  return errors;
}

/** Raw HTML as a crawler that doesn't run JavaScript would see it. */
async function rawHtml(page: Page, path: string) {
  const response = await page.request.get(path);
  expect(response.status(), `GET ${path}`).toBe(200);
  return response.text();
}

function metaContent(html: string, pattern: RegExp): string | undefined {
  return html.match(pattern)?.[1];
}

test.describe("prerendered public pages (no login required)", () => {
  test("the homepage is prerendered: brand metadata, real copy and internal links", async ({ page }) => {
    const errors = collectErrors(page);
    const html = await rawHtml(page, "/");

    expect(metaContent(html, /<title>([^<]*)<\/title>/)).toBe(
      "Pathfind — Verified Opportunities for High School Students",
    );
    expect(html).toContain('<link rel="canonical" href="https://www.getpathfind.com/" />');
    expect(metaContent(html, /<meta name="robots" content="([^"]*)"/)).toBe("index, follow");

    // Brand signals: every spelling of the brand resolves to www.getpathfind.com. The homepage
    // graph comes from the HTML template (pretty-printed), so compare without whitespace.
    const compact = html.replace(/\s+/g, "");
    expect(compact).toContain('"@type":"WebSite"');
    expect(compact).toContain('"@type":"Organization"');
    expect(compact).toContain('"name":"Pathfind"');
    expect(compact).toContain('"alternateName":["GetPathfind","getpathfind.com"]');
    expect(compact).toContain('"url":"https://www.getpathfind.com/"');

    // A crawler that never runs JavaScript still gets the hero copy and the crawl paths.
    const body = html.slice(html.indexOf("<body"));
    const text = body.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    expect(text.length).toBeGreaterThan(5_000);
    const links = [...new Set([...body.matchAll(/href="(\/[^"]*)"/g)].map((m) => m[1]))];
    expect(links.length).toBeGreaterThan(20);
    expect(links.some((href) => href.startsWith("/opportunities/"))).toBe(true);

    // And it hydrates without React regenerating the tree.
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator(".op-card").first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("topic hub /stem ships crawlable metadata, JSON-LD and internal links", async ({ page }) => {
    const errors = collectErrors(page);
    const html = await rawHtml(page, "/stem");

    expect(metaContent(html, /<title>([^<]*)<\/title>/)).toBe(
      "STEM Opportunities for High School Students | Pathfind",
    );
    const description = metaContent(html, /<meta name="description" content="([^"]*)"/) ?? "";
    expect(description).toContain("STEM");
    expect(description).toContain("verified");
    expect(description).toContain("high school");
    expect(html).toContain('<link rel="canonical" href="https://www.getpathfind.com/stem" />');
    expect(html).toContain('<meta property="og:title" content="STEM Opportunities for High School Students | Pathfind" />');
    expect(html).toContain('<meta property="og:url" content="https://www.getpathfind.com/stem" />');
    expect(metaContent(html, /<meta name="robots" content="([^"]*)"/)).toBe("index, follow");

    // Page-level structured data, without the homepage's WebSite graph leaking in.
    expect(html).toContain('"@type":"CollectionPage"');
    expect(html).toContain('"@type":"BreadcrumbList"');
    expect(html).not.toContain('"@type":"WebSite"');

    // Real content in the HTML, not an empty SPA shell.
    expect(html).toContain("<h1>STEM Opportunities for High School Students</h1>");
    expect(html).toContain("opportunities/amc");
    expect(html).toContain("/interests/computer-science");

    // And the hydrated page is usable.
    await page.goto("/stem");
    await expect(page.getByRole("heading", { level: 1, name: /STEM Opportunities/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Computer Science Opportunities/ })).toBeVisible();
    await expect(page.locator(".op-card").first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("an opportunity page explains it, then links out to the official site", async ({ page }) => {
    const errors = collectErrors(page);
    const html = await rawHtml(page, "/opportunities/amc");

    expect(metaContent(html, /<title>([^<]*)<\/title>/)).toBe(
      "AMC 10/12 | Pathfind",
    );
    expect(html).toContain('<link rel="canonical" href="https://www.getpathfind.com/opportunities/amc" />');
    expect(html).toContain('"@type":"WebPage"');

    await page.goto("/opportunities/amc");
    await expect(page.getByRole("heading", { level: 1, name: "AMC 10/12" })).toBeVisible();
    await expect(page.getByText("Mathematical Association of America").first()).toBeVisible();
    await expect(page.getByRole("complementary").getByText(/Grades 9–12/)).toBeVisible();

    // Official site is a real link, and it isn't opened automatically.
    const visit = page.getByRole("link", { name: /official site/i });
    await expect(visit).toHaveAttribute("href", "https://maa.org/student-programs/amc/");
    await expect(visit).toHaveAttribute("rel", "noreferrer");

    // Save works while signed out (localStorage), and survives a refresh.
    await page.getByRole("button", { name: "Save opportunity", exact: true }).click();
    await expect(page.getByRole("button", { name: "Saved", exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("button", { name: "Saved", exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("a guide page leads with real editorial prose and links on to categories", async ({ page }) => {
    const errors = collectErrors(page);
    const html = await rawHtml(page, "/guides/volunteer-opportunities-for-high-school-students");

    expect(metaContent(html, /<title>([^<]*)<\/title>/)).toBe(
      "Volunteer Opportunities for High School Students",
    );
    expect(html).toContain("community service");
    expect(html).toContain('"@type":"CollectionPage"');
    expect(html).toContain('"@type":"BreadcrumbList"');

    await page.goto("/guides/volunteer-opportunities-for-high-school-students");
    await expect(page.getByRole("heading", { level: 1, name: /Volunteer Opportunities/ })).toBeVisible();
    const intro = page.locator(".seo-guide-intro p");
    expect(await intro.count()).toBeGreaterThanOrEqual(3);
    await expect(page.getByRole("link", { name: /Social Impact & Service Opportunities/ }).first()).toBeVisible();
    await expect(page.locator(".op-card").first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("the hub links to every category family, including the new topic hubs", async ({ page }) => {
    await page.goto("/opportunities");
    const nav = page.getByRole("navigation", { name: "Browse by category" });
    await expect(nav.getByRole("link", { name: "STEM" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Business" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Grade 9" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Research Programs" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Choosing a Competition in High School/ })).toBeVisible();
  });

  test("a student can navigate hub → category → opportunity without signing in", async ({ page }) => {
    const errors = collectErrors(page);

    await page.goto("/opportunities");
    await page.getByRole("navigation", { name: "Browse by category" }).getByRole("link", { name: "STEM" }).click();
    await expect(page).toHaveURL(/\/stem$/);

    await page.getByRole("link", { name: /Computer Science Opportunities/ }).click();
    await expect(page).toHaveURL(/\/interests\/computer-science$/);
    await expect(page.getByRole("heading", { level: 1, name: /Computer Science Opportunities/ })).toBeVisible();

    const title = (await page.locator(".op-card-title").first().innerText()).trim();
    await page.locator(".op-card-title-link").first().click();
    await expect(page).toHaveURL(/\/opportunities\/.+/);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();

    // No sign-in wall anywhere in this path.
    await expect(page.getByRole("button", { name: /Sign in|Continue with Google/ })).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test("an unknown URL shows Pathfind's not-found page that routes students back in", async ({ page }) => {
    await page.goto("/this-page-does-not-exist");
    await expect(page.getByRole("heading", { level: 1, name: /Page Not Found|couldn't find|404/i })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.getByRole("link", { name: /opportunities/i }).first()).toBeVisible();
  });

  test("mobile: topic hub has no horizontal overflow and its content is reachable", async ({ page }) => {
    const errors = collectErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/stem");

    await expect(page.getByRole("heading", { level: 1, name: /STEM Opportunities/ })).toBeVisible();
    await page.locator(".seo-related a").first().scrollIntoViewIfNeeded();
    await expect(page.locator(".seo-related a").first()).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
  });

  test("mobile: every public page keeps one-thumb tap targets and never scrolls sideways", async ({ page }) => {
    // 375px is the narrowest phone still in wide use; these pages are almost entirely lists
    // of links, so a small target here is the difference between usable and not.
    await page.setViewportSize({ width: 375, height: 667 });

    for (const path of ["/", "/opportunities", "/stem", "/opportunities/amc", "/guides"]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page.locator("#root")).not.toBeEmpty();

      const audit = await page.evaluate(() => {
        const doc = document.documentElement;
        const tooSmall: string[] = [];

        for (const el of Array.from(
          document.querySelectorAll<HTMLElement>("a[href], button, input, select, [role=button]"),
        )) {
          const rect = el.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) continue; // hidden (e.g. the mobile menu)
          // Rounded: sub-pixel layout means a 32px target measures 31.98.
          const width = Math.round(rect.width);
          const height = Math.round(rect.height);
          // WCAG 2.5.8 floor is 24px; 32px is the comfortable thumb target for this layout.
          if (height < 32 || width < 20) {
            tooSmall.push(`${(el.className || el.tagName).toString().slice(0, 40)} ${width}x${height}`);
          }
        }

        const header = Array.from(
          document.querySelectorAll<HTMLElement>(
            ".seo-page-header a, .top-nav-action, .top-nav-hamburger",
          ),
        ).map((el) => Math.round(el.getBoundingClientRect().height));

        return { overflow: doc.scrollWidth - doc.clientWidth, tooSmall, header };
      });

      expect(audit.overflow, `${path} scrolls sideways`).toBeLessThanOrEqual(1);
      expect(audit.tooSmall, `${path} has tap targets under 32px`).toEqual([]);
      for (const height of audit.header) {
        expect(height, `${path} header control is too small to tap`).toBeGreaterThanOrEqual(32);
      }
    }
  });

  test("every sitemap URL is a real page that returns 200", async ({ page }) => {
    const sitemap = await (await page.request.get("/sitemap.xml")).text();
    const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
    expect(urls.length).toBeGreaterThan(150);

    // Sample across every page family rather than hammering all 160.
    const sample = [
      `${SITE}/`,
      `${SITE}/opportunities`,
      `${SITE}/guides`,
      ...urls.filter((url) => url.includes("/opportunities/")).slice(0, 3),
      ...urls.filter((url) => url.includes("/guides/")).slice(0, 2),
      ...urls.filter((url) => url.includes("/interests/")).slice(0, 2),
      ...urls.filter((url) => url.includes("/grades/")).slice(0, 2),
      `${SITE}/stem`,
      `${SITE}/business`,
      `${SITE}/free-programs`,
    ];

    for (const url of sample) {
      const response = await page.request.get(url.replace(SITE, ""));
      expect(response.status(), url).toBe(200);
      const html = await response.text();

      expect(html, url).toMatch(/<h1[\s>]/);
      // Every page declares itself canonical (www host, no trailing slash).
      expect(html, url).toContain(`<link rel="canonical" href="${url}" />`);
    }
  });
});
