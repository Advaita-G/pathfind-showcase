import { defineConfig, devices } from "@playwright/test";

/**
 * Runs the public SEO pages against the *built* output (prerendered HTML + hydration),
 * which is what crawlers and production actually see. The dev server renders these pages
 * client-side only, so it can't catch a prerender or hydration regression.
 *
 * Usage: npm run test:e2e:seo
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: /seo-pages\.spec\.ts/,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Vercel-style static serving of dist/ (directory indexes + 404.html).
    command: "node scripts/serve-static.mjs 4173",
    url: "http://localhost:4173/opportunities",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
