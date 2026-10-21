export function routeToOutputPath(routePath) {
  const trimmed = routePath.replace(/^\/+/, "");
  return `${trimmed}/index.html`;
}

function escapeHtml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Replaces a single meta tag regardless of whether the template wrote it on one line or
 * spread it across several. Returns the html unchanged if the tag isn't present.
 */
function replaceMeta(html, { attribute, key, value }) {
  const pattern = new RegExp(`<meta\\s+${attribute}="${key}"[\\s\\S]*?\\/>`);
  if (!pattern.test(html)) return html;
  return html.replace(pattern, `<meta ${attribute}="${key}" content="${escapeHtml(value)}" />`);
}

// Note the escaped "+" — `ld+json` unescaped would be a quantifier and never match.
const STRUCTURED_DATA_BLOCK = /\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/;

export function injectIntoTemplate(
  template,
  { title, description, canonical, appHtml, robotsNoindex, buildDay, keepSiteGraph },
) {
  // The template ships the homepage's WebSite/Organization graph. Every route below "/"
  // renders its own page-level JSON-LD inside the app markup, so carrying the homepage
  // block along as well would just duplicate the site entity on 150+ pages. The homepage
  // itself keeps the block — it is the only page that describes the site entity.
  let html = keepSiteGraph ? template : template.replace(STRUCTURED_DATA_BLOCK, "");
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`);
  html = replaceMeta(html, { attribute: "name", key: "description", value: description });
  html = html.replace(
    /<link rel="canonical"[^>]*\/>/,
    `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
  );
  html = html.replace(
    /<meta name="robots" content="[^"]*" \/>/,
    `<meta name="robots" content="${robotsNoindex ? "noindex, follow" : "index, follow"}" />`,
  );

  // Social cards. Without these every prerendered page advertised the homepage's title
  // and description, since the template's Open Graph tags were copied verbatim.
  for (const { attribute, key, value } of [
    { attribute: "property", key: "og:title", value: title },
    { attribute: "property", key: "og:description", value: description },
    { attribute: "property", key: "og:url", value: canonical },
    { attribute: "name", key: "twitter:title", value: title },
    { attribute: "name", key: "twitter:description", value: description },
    { attribute: "name", key: "twitter:url", value: canonical },
  ]) {
    html = replaceMeta(html, { attribute, key, value });
  }

  // Pages are rendered once and served for weeks, so date-derived markup ("42 days left",
  // upcoming-vs-passed ordering) is computed from this stamp on the first render — on the
  // server and during hydration alike — and corrected from the real date right after.
  if (buildDay) {
    html = html.replace(/<meta name="pathfind-build-day" content="[^"]*" \/>\n?\s*/g, "");
    html = html.replace(
      "</head>",
      `    <meta name="pathfind-build-day" content="${escapeHtml(buildDay)}" />\n  </head>`,
    );
  }

  html = html.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);
  return html;
}

export function buildSitemapXml(entries) {
  const urls = entries
    .map(
      (entry) =>
        `  <url>\n    <loc>${entry.loc}</loc>\n    <lastmod>${entry.lastmod}</lastmod>\n    <priority>${entry.priority.toFixed(
          1,
        )}</priority>\n  </url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
