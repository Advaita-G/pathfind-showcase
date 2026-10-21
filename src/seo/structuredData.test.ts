import { describe, expect, it } from "vitest";
import { collectionPageJsonLd, webPageJsonLd, websiteJsonLd } from "./structuredData";

describe("websiteJsonLd", () => {
  it("describes the site and organization without inventing details", () => {
    const data = websiteJsonLd("A description") as any;
    expect(data["@context"]).toBe("https://schema.org");
    const types = data["@graph"].map((node: any) => node["@type"]);
    expect(types).toEqual(["WebSite", "Organization"]);

    const website = data["@graph"][0];
    expect(website.url).toBe("https://www.getpathfind.com/");
    expect(website.name).toBe("Pathfind");
    expect(website.alternateName).toContain("GetPathfind");
    expect(website.publisher["@id"]).toBe("https://www.getpathfind.com/#organization");

    const organization = data["@graph"][1];
    expect(organization.url).toBe("https://www.getpathfind.com/");

    // Nothing we can't verify should sneak in.
    for (const key of ["address", "founder", "award", "aggregateRating", "review", "telephone"]) {
      expect(organization).not.toHaveProperty(key);
    }
  });
});

describe("webPageJsonLd", () => {
  it("marks the page as part of the site", () => {
    const data = webPageJsonLd({
      name: "AMC 10/12",
      description: "desc",
      canonical: "https://www.getpathfind.com/opportunities/amc-10-12",
    }) as any;
    expect(data["@type"]).toBe("WebPage");
    expect(data.url).toBe("https://www.getpathfind.com/opportunities/amc-10-12");
    expect(data.isPartOf["@id"]).toBe("https://www.getpathfind.com/#website");
  });
});

describe("collectionPageJsonLd", () => {
  const base = {
    name: "Competitions",
    description: "desc",
    canonical: "https://www.getpathfind.com/competitions",
  };

  it("lists the page's items in order", () => {
    const data = collectionPageJsonLd({
      ...base,
      itemUrls: ["https://www.getpathfind.com/opportunities/a", "https://www.getpathfind.com/opportunities/b"],
    }) as any;
    expect(data["@type"]).toBe("CollectionPage");
    expect(data.mainEntity["@type"]).toBe("ItemList");
    expect(data.mainEntity.numberOfItems).toBe(2);
    expect(data.mainEntity.itemListElement[0]).toEqual({
      "@type": "ListItem",
      position: 1,
      url: "https://www.getpathfind.com/opportunities/a",
    });
  });

  it("caps the item list so hub pages don't emit unbounded markup", () => {
    const itemUrls = Array.from({ length: 118 }, (_, index) => `https://www.getpathfind.com/opportunities/${index}`);
    const data = collectionPageJsonLd({ ...base, itemUrls }) as any;
    expect(data.mainEntity.itemListElement).toHaveLength(40);
    expect(data.mainEntity.numberOfItems).toBe(118);
  });

  it("omits the item list entirely when the page lists nothing", () => {
    const data = collectionPageJsonLd({ ...base, itemUrls: [] }) as any;
    expect(data).not.toHaveProperty("mainEntity");
  });
});
