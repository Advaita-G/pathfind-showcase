import { describe, expect, it } from "vitest";
import { buildAllRoutes } from "./routes";
import { OPPORTUNITIES } from "../data/opportunities";
import { ALL_CATEGORIES } from "./categories";
import { GUIDES } from "./guides";
import { DEMO_PATHFIND_IDEAS } from "../data/pathfindIdeas";

describe("buildAllRoutes", () => {
  const routes = buildAllRoutes();

  it("counts: hub + private pages + categories + guides-index + guides + one per opportunity + one per idea", () => {
    expect(routes.length).toBe(4 + ALL_CATEGORIES.length + 1 + GUIDES.length + OPPORTUNITIES.length + DEMO_PATHFIND_IDEAS.length);
  });

  it("prerenders /profile as a private page: noindex, never in the sitemap", () => {
    const profile = routes.find((r) => r.path === "/profile");
    expect(profile?.noindex).toBe(true);
    expect(routes.filter((r) => r.noindex).map((r) => r.path).slice(0, 3)).toEqual(["/profile", "/plans", "/shared"]);
    for (const idea of DEMO_PATHFIND_IDEAS) expect(routes.find((r) => r.path === `/ideas/${idea.id}`)?.noindex).toBe(true);
  });

  it("has unique paths, all starting with /", () => {
    const paths = routes.map((r) => r.path);
    expect(new Set(paths).size).toBe(paths.length);
    for (const path of paths) expect(path.startsWith("/")).toBe(true);
  });

  it("never includes / or /404", () => {
    const paths = routes.map((r) => r.path);
    expect(paths).not.toContain("/");
    expect(paths).not.toContain("/404");
  });

  it("includes the hub, guides index, and every opportunity detail path", () => {
    const paths = routes.map((r) => r.path);
    expect(paths).toContain("/opportunities");
    expect(paths).toContain("/guides");
    for (const o of OPPORTUNITIES) expect(paths).toContain(`/opportunities/${o.id}`);
  });
});
