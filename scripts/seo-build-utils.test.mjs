import { describe, expect, it } from "vitest";
import { buildSitemapXml, injectIntoTemplate, routeToOutputPath } from "./seo-build-utils.mjs";

describe("routeToOutputPath", () => {
  it("converts a nested opportunity path to a directory index file", () => {
    expect(routeToOutputPath("/opportunities/cosmos")).toBe("opportunities/cosmos/index.html");
  });

  it("converts a single-segment path", () => {
    expect(routeToOutputPath("/guides")).toBe("guides/index.html");
  });
});

describe("injectIntoTemplate", () => {
  const template = `<!doctype html>
<html lang="en">
  <head>
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="https://www.getpathfind.com/" />
    <title>Old Title</title>
    <meta
      name="description"
      content="Old description"
    />
    <meta property="og:title" content="Old OG title" />
    <meta
      property="og:description"
      content="Old OG description"
    />
    <meta property="og:url" content="https://www.getpathfind.com/" />
    <meta name="twitter:title" content="Old Twitter title" />
    <meta name="twitter:description" content="Old Twitter description" />
    <script type="application/ld+json">{"@type":"WebSite"}</script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`;

  const injected = (overrides = {}) =>
    injectIntoTemplate(template, {
      title: "New Title",
      description: "New description",
      canonical: "https://www.getpathfind.com/opportunities/cosmos",
      appHtml: "<div>hello</div>",
      robotsNoindex: false,
      ...overrides,
    });

  it("replaces title, description, canonical, robots, and root content", () => {
    const html = injectIntoTemplate(template, {
      title: "New Title",
      description: "New description",
      canonical: "https://www.getpathfind.com/opportunities/cosmos",
      appHtml: "<div>hello</div>",
      robotsNoindex: false,
    });
    expect(html).toContain("<title>New Title</title>");
    expect(html).toContain('content="New description"');
    expect(html).toContain('href="https://www.getpathfind.com/opportunities/cosmos"');
    expect(html).toContain('<div id="root"><div>hello</div></div>');
    expect(html).toContain('content="index, follow"');
  });

  it("marks robots noindex when requested", () => {
    const html = injectIntoTemplate(template, {
      title: "404",
      description: "Not found",
      canonical: "https://www.getpathfind.com/404",
      appHtml: "<div>404</div>",
      robotsNoindex: true,
    });
    expect(html).toContain('content="noindex, follow"');
  });

  it("rewrites the social cards to the page's own title and URL", () => {
    const html = injected();
    expect(html).toContain('<meta property="og:title" content="New Title" />');
    expect(html).toContain('<meta property="og:description" content="New description" />');
    expect(html).toContain(
      '<meta property="og:url" content="https://www.getpathfind.com/opportunities/cosmos" />',
    );
    expect(html).toContain('<meta name="twitter:title" content="New Title" />');
    expect(html).toContain('<meta name="twitter:description" content="New description" />');
    expect(html).not.toContain("Old OG title");
    expect(html).not.toContain("Old Twitter description");
  });

  it("drops the homepage's WebSite structured data from prerendered pages", () => {
    const html = injected();
    expect(html).not.toContain('"@type":"WebSite"');
  });

  it("keeps the WebSite graph on the homepage, which is the page that owns the site entity", () => {
    const html = injected({ keepSiteGraph: true });
    expect(html).toContain('"@type":"WebSite"');
    expect(html.match(/pathfind-build-day/g)).toBeNull();
  });

  it("stamps the build day so date-derived markup hydrates identically", () => {
    const html = injected({ buildDay: "2026-09-14" });
    expect(html).toContain('<meta name="pathfind-build-day" content="2026-09-14" />');
    expect(html.indexOf("pathfind-build-day")).toBeLessThan(html.indexOf("</head>"));
  });

  it("does not leave a stale build-day stamp behind when one is re-injected", () => {
    const once = injected({ buildDay: "2026-09-14" });
    const twice = injectIntoTemplate(once, {
      title: "New Title",
      description: "New description",
      canonical: "https://www.getpathfind.com/opportunities/cosmos",
      appHtml: "<div>hello</div>",
      robotsNoindex: false,
      buildDay: "2026-09-15",
    });
    expect(twice).not.toContain("2026-09-14");
    expect(twice.match(/pathfind-build-day/g)).toHaveLength(1);
  });

  it("escapes special characters in the title", () => {
    const html = injectIntoTemplate(template, {
      title: 'Research & Development <script>',
      description: "d",
      canonical: "https://www.getpathfind.com/x",
      appHtml: "<div />",
      robotsNoindex: false,
    });
    expect(html).toContain("Research &amp; Development &lt;script&gt;");
  });
});

describe("buildSitemapXml", () => {
  it("includes every entry with its priority formatted to one decimal", () => {
    const xml = buildSitemapXml([
      { loc: "https://www.getpathfind.com/", lastmod: "2026-09-14", priority: 1 },
      { loc: "https://www.getpathfind.com/opportunities", lastmod: "2026-09-14", priority: 0.9 },
    ]);
    expect(xml).toContain("<loc>https://www.getpathfind.com/</loc>");
    expect(xml).toContain("<loc>https://www.getpathfind.com/opportunities</loc>");
    expect(xml).toContain("<priority>1.0</priority>");
    expect(xml).toContain("<priority>0.9</priority>");
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
  });
});
