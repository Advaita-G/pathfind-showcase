// scripts/prerender.mjs
import fs from "node:fs";
import path from "node:path";
import { render, buildAllRoutes, resolveRouteMeta } from "../dist/server/entry-server.js";
import { routeToOutputPath, injectIntoTemplate, buildSitemapXml } from "./seo-build-utils.mjs";

const SITE_URL = "https://www.getpathfind.com";
const template = fs.readFileSync("dist/index.html", "utf-8");

// Local calendar day (not UTC), matching how the app derives "today" from a Date — a UTC
// stamp would disagree with the viewer's date for part of every day.
function todayIso() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

const buildDate = todayIso();

const routes = buildAllRoutes();
const sitemapEntries = [{ loc: `${SITE_URL}/`, lastmod: buildDate, priority: 1.0 }];

for (const route of routes) {
  const meta = resolveRouteMeta(route.path);
  const appHtml = await render(route.path, buildDate);
  const html = injectIntoTemplate(template, {
    title: meta.title,
    description: meta.description,
    canonical: meta.canonical,
    appHtml,
    // Private app pages (e.g. /profile) are prerendered only so a direct visit works;
    // noindex always wins over whatever the route resolver returns for them.
    robotsNoindex: meta.robotsNoindex ?? route.noindex ?? false,
    buildDay: buildDate,
  });
  const outputPath = path.join("dist", routeToOutputPath(route.path));
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, html);
  if (!route.noindex) {
    sitemapEntries.push({ loc: `${SITE_URL}${route.path}`, lastmod: buildDate, priority: route.priority });
  }
}

// The homepage is Vite's entry file (dist/index.html). Rendering it — instead of serving the
// bare shell — is what gives crawlers the hero copy, the featured opportunities and the
// internal links to the category and guide pages. It keeps the template's
// WebSite/Organization graph, which no other page needs or carries.
const homeMeta = resolveRouteMeta("/");
const homeHtml = injectIntoTemplate(template, {
  title: homeMeta.title,
  description: homeMeta.description,
  canonical: homeMeta.canonical,
  appHtml: await render("/", buildDate),
  robotsNoindex: homeMeta.robotsNoindex ?? false,
  buildDay: buildDate,
  keepSiteGraph: true,
});
fs.writeFileSync("dist/index.html", homeHtml);

// The 404 page is rendered separately and written to dist/404.html — Vercel's
// convention for a static custom 404 — and is never listed in the sitemap.
const notFoundMeta = resolveRouteMeta("/this-path-does-not-exist");
const notFoundHtml = injectIntoTemplate(template, {
  title: notFoundMeta.title,
  description: notFoundMeta.description,
  canonical: notFoundMeta.canonical,
  appHtml: await render("/this-path-does-not-exist", buildDate),
  robotsNoindex: true,
  buildDay: buildDate,
});
fs.writeFileSync("dist/404.html", notFoundHtml);

fs.writeFileSync("dist/sitemap.xml", buildSitemapXml(sitemapEntries));

fs.rmSync("dist/server", { recursive: true, force: true });

console.log(`Prerendered ${routes.length} pages + 404 + sitemap.xml`);
