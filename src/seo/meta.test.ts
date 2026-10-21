import { describe, expect, it } from "vitest";
import {
  categoryMeta,
  guideMeta,
  guidesIndexMeta,
  hubMeta,
  notFoundMeta,
  opportunityMeta,
  resolveRouteMeta,
  siteUrl,
} from "./meta";
import { OPPORTUNITIES } from "../data/opportunities";
import { ALL_CATEGORIES } from "./categories";
import { GUIDES } from "./guides";
import { buildAllRoutes } from "./routes";

describe("siteUrl", () => {
  it("prefixes a path with the site origin", () => {
    expect(siteUrl("/opportunities/cosmos")).toBe("https://www.getpathfind.com/opportunities/cosmos");
  });
});

describe("opportunityMeta", () => {
  it("produces a title containing the program name and a description under 160 chars", () => {
    const opportunity = OPPORTUNITIES[0];
    const meta = opportunityMeta(opportunity);
    expect(meta.title).toContain(opportunity.title);
    expect(meta.description.length).toBeLessThanOrEqual(160);
    expect(meta.canonical).toBe(`https://www.getpathfind.com/opportunities/${opportunity.id}`);
  });
});

describe("categoryMeta", () => {
  it("embeds the count and stays under 160 chars", () => {
    const category = ALL_CATEGORIES[0];
    const meta = categoryMeta(category, 12);
    expect(meta.description).toContain("12");
    expect(meta.description.length).toBeLessThanOrEqual(160);
  });
});

describe("guideMeta", () => {
  it("embeds the count and stays under 160 chars", () => {
    const guide = GUIDES[0];
    const meta = guideMeta(guide, 5);
    expect(meta.description).toContain("5");
    expect(meta.description.length).toBeLessThanOrEqual(160);
  });
});

describe("hubMeta / guidesIndexMeta / notFoundMeta", () => {
  it("hubMeta canonicalizes to /opportunities", () => {
    expect(hubMeta(118).canonical).toBe("https://www.getpathfind.com/opportunities");
  });
  it("guidesIndexMeta canonicalizes to /guides", () => {
    expect(guidesIndexMeta().canonical).toBe("https://www.getpathfind.com/guides");
  });
  it("notFoundMeta is marked noindex", () => {
    expect(notFoundMeta().robotsNoindex).toBe(true);
  });
});

describe("every public page has its own metadata", () => {
  // "/" is rendered by the prerenderer too, but it builds its route list separately because
  // Vite emits it as dist/index.html rather than a directory index.
  const routes = [{ path: "/" }, ...buildAllRoutes()];

  it("covers every route the prerenderer writes", () => {
    expect(routes.length).toBeGreaterThan(100);
  });

  it("uses a unique title and description per page", () => {
    const titles = new Map<string, string>();
    const descriptions = new Map<string, string>();

    for (const route of routes) {
      const meta = resolveRouteMeta(route.path);
      const duplicateTitle = titles.get(meta.title);
      const duplicateDescription = descriptions.get(meta.description);
      expect(duplicateTitle, `${route.path} reuses the title of ${duplicateTitle}`).toBeUndefined();
      expect(duplicateDescription, `${route.path} reuses the description of ${duplicateDescription}`).toBeUndefined();
      titles.set(meta.title, route.path);
      descriptions.set(meta.description, route.path);
    }
  });

  it("keeps every title within a search result, dropping the brand only when it can't fit", () => {
    for (const route of routes) {
      const { title } = resolveRouteMeta(route.path);
      // Display budget: past ~60 chars the tail of a title is elided in results, so the
      // words a student searched have to come first. 70 is the hard ceiling.
      expect(title.length, `${route.path} title too long to display`).toBeLessThanOrEqual(70);
      expect(
        title.length,
        `${route.path} title runs past the display budget before truncation`,
      ).toBeLessThanOrEqual(60);
      // The homepage leads with the brand instead, which is the point of that page.
      if (route.path === "/") {
        expect(title.startsWith("Pathfind")).toBe(true);
        continue;
      }
      if (!title.endsWith("| Pathfind")) {
        // The only acceptable reason to lose the brand is that it genuinely didn't fit.
        expect(title.length, `${route.path} dropped the brand unnecessarily`).toBeGreaterThan(45);
      }
    }
  });

  it("keeps every description within Google's practical length and each page indexable", () => {
    for (const route of routes) {
      const meta = resolveRouteMeta(route.path);
      expect(meta.description.length, `${route.path} description too long`).toBeLessThanOrEqual(160);
      expect(meta.description.length, `${route.path} description too short`).toBeGreaterThan(40);
      // /profile is the one deliberate exception: a private page, prerendered for direct
      // visits and permanently noindexed.
      if ("noindex" in route && route.noindex) {
        expect(meta.robotsNoindex, `${route.path} must stay noindexed`).toBe(true);
      } else {
        expect(meta.robotsNoindex, `${route.path} should be indexable`).toBeFalsy();
      }
      expect(meta.canonical.startsWith("https://www.getpathfind.com/")).toBe(true);
    }
  });
});

describe("opportunityTitle display budget", () => {
  // Program names lead so the words a student searched survive result truncation; the
  // organization moves to the description (and stays in the page's eyebrow and facts).
  it("leads with the program name, not the organization", () => {
    const amc = OPPORTUNITIES.find((o) => o.id === "amc")!;
    expect(opportunityMeta(amc).title).toBe("AMC 10/12 | Pathfind");

    const simr = OPPORTUNITIES.find((o) => o.id === "simr")!;
    const title = opportunityMeta(simr).title;
    expect(title.startsWith("Stanford Institutes of Medicine")).toBe(true);
    expect(title.length).toBeLessThanOrEqual(60);
  });

  it("keeps every opportunity title within the display budget", () => {
    for (const o of OPPORTUNITIES) {
      expect(opportunityMeta(o).title.length, o.id).toBeLessThanOrEqual(60);
    }
  });
});

describe("resolveRouteMeta", () => {
  it("resolves an opportunity path", () => {
    const opportunity = OPPORTUNITIES[0];
    expect(resolveRouteMeta(`/opportunities/${opportunity.id}`).title).toContain(opportunity.title);
  });
  it("resolves a category path", () => {
    expect(resolveRouteMeta("/research-programs").title).toContain("Research Programs");
  });
  it("resolves a guide path", () => {
    expect(resolveRouteMeta("/guides/competitions-for-high-school-students").title).toBe(
      "Choosing a Competition in High School | Pathfind",
    );
  });
  it("resolves the homepage, whose canonical is the bare www host", () => {
    const meta = resolveRouteMeta("/");
    expect(meta.canonical).toBe("https://www.getpathfind.com/");
    expect(meta.title).toBe("Pathfind — Verified Opportunities for High School Students");
    expect(meta.robotsNoindex).toBeFalsy();
  });
  it("resolves the hub and guides-index paths", () => {
    expect(resolveRouteMeta("/opportunities").canonical).toContain("/opportunities");
    expect(resolveRouteMeta("/guides").canonical).toContain("/guides");
  });
  it("falls back to notFoundMeta for an unknown path", () => {
    expect(resolveRouteMeta("/nope-not-real").robotsNoindex).toBe(true);
  });
});
