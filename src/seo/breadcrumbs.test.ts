import { describe, expect, it } from "vitest";
import { buildBreadcrumbJsonLd } from "./breadcrumbs";

describe("buildBreadcrumbJsonLd", () => {
  it("produces a valid BreadcrumbList with 1-indexed positions and absolute URLs", () => {
    const json = buildBreadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Research Programs", path: "/research-programs" },
      { name: "COSMOS", path: "/opportunities/cosmos" },
    ]);
    const parsed = JSON.parse(json);
    expect(parsed["@type"]).toBe("BreadcrumbList");
    expect(parsed.itemListElement).toHaveLength(3);
    expect(parsed.itemListElement[0].position).toBe(1);
    expect(parsed.itemListElement[2].position).toBe(3);
    expect(parsed.itemListElement[2].item).toBe("https://www.getpathfind.com/opportunities/cosmos");
    expect(parsed.itemListElement[2].name).toBe("COSMOS");
  });
});
