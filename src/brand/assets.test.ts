import { describe, expect, test } from "vitest";
import { BRAND_ASSETS, LOCKUP_HEIGHT, LOCKUP_WIDTH } from "./assets";

/**
 * The files exactly as they ship: every SVG under `public/`, keyed by its served URL.
 * Read through Vite rather than `node:fs` so this stays inside the app's type
 * environment (tsconfig deliberately does not pull in node types).
 */
const SVG_SOURCES: Record<string, string> = Object.fromEntries(
  Object.entries(
    import.meta.glob("/public/**/*.svg", { query: "?raw", import: "default", eager: true }),
  ).map(([file, svg]) => [file.replace(/^\/public/, ""), svg as string]),
);

/** The approved palette — the logo may use nothing else. */
const BRAND_COLOURS = ["#173e2d", "#d87635", "#f4f1e6", "#12261e"] as const;

const FOREST = "#173e2d";
const ORANGE = "#d87635";
const IVORY = "#f4f1e6";
const DARK_GREEN = "#12261e";

/** Master geometry: the P/path, the arrow, and the lockup's intrinsic box. */
const MASTER_PATH = "M 40,90 V 45 C 40,25 75,25 75,45 C 75,60 55,65 60,80 L 85,95";
const MASTER_ARROW = "85,102 110,95 95,70";
const MASTER_VIEW_BOX = `0 0 ${LOCKUP_WIDTH} ${LOCKUP_HEIGHT}`;

/**
 * The symbol's ink box, used to crop the square icon's viewBox: the path and polygon
 * bounds, inflated by the 6 units the round stroke cap/join adds on every side.
 */
const SYMBOL_INK = { left: 34, right: 110, top: 24, bottom: 102 };

function readAsset(url: string): string {
  const svg = SVG_SOURCES[url];
  if (!svg) throw new Error(`${url} is missing from public/`);
  return svg;
}

function geometry(svg: string) {
  return {
    path: svg.match(/<path[^>]*\sd="([^"]+)"/)?.[1].replace(/\s+/g, " ").trim(),
    arrow: svg.match(/<polygon[^>]*\spoints="([^"]+)"/)?.[1].replace(/\s+/g, " ").trim(),
  };
}

function attrsOf(svg: string, tag: string): Record<string, string> {
  const match = svg.match(new RegExp(`<${tag}([^>]*)>`));
  if (!match) throw new Error(`no <${tag}> in ${svg.slice(0, 80)}`);
  return Object.fromEntries(
    [...match[1].matchAll(/([\w:-]+)="([^"]*)"/g)].map(([, key, value]) => [key, value]),
  );
}

/** Wordmark metrics, ignoring the ink colour (which differs by design). */
function wordmarkMetrics(svg: string): Record<string, string> {
  const attrs = attrsOf(svg, "text");
  delete attrs.fill;
  return attrs;
}

function coloursIn(svg: string): string[] {
  return (svg.match(/#[0-9a-fA-F]{6}/g) ?? []).map((hex) => hex.toLowerCase());
}

describe("brand assets", () => {
  test("every asset the app references exists and is an SVG", () => {
    for (const url of Object.values(BRAND_ASSETS)) {
      expect(readAsset(url), `${url} is not an SVG`).toContain("<svg");
    }
  });

  test("only locked brand colours are used", () => {
    for (const url of Object.values(BRAND_ASSETS)) {
      for (const colour of coloursIn(readAsset(url))) {
        expect(BRAND_COLOURS, `${url} uses ${colour}`).toContain(colour);
      }
    }
  });

  test("both lockups are the master geometry in different colourways", () => {
    const light = readAsset(BRAND_ASSETS.logoLight);
    const dark = readAsset(BRAND_ASSETS.logoDark);

    // Identical artwork: only the ink colour may differ between the two files.
    expect(geometry(dark)).toEqual(geometry(light));
    expect(geometry(light).path).toBe(MASTER_PATH);
    expect(geometry(light).arrow).toBe(MASTER_ARROW);
    for (const svg of [light, dark]) {
      expect(attrsOf(svg, "svg").viewBox).toBe(MASTER_VIEW_BOX);
    }

    // The nav's cross-fade depends on these two being a true pair.
    expect(attrsOf(dark, "path").stroke).toBe(IVORY);
    expect(attrsOf(dark, "text").fill).toBe(IVORY);
    expect(attrsOf(light, "path").stroke).toBe(FOREST);
    expect(attrsOf(light, "text").fill).toBe(FOREST);
    for (const svg of [light, dark]) {
      expect(attrsOf(svg, "polygon").fill).toBe(ORANGE);
    }

    // Wordmark: the approved typeface and metrics, identical in both files.
    const lightText = attrsOf(light, "text");
    expect(lightText["font-family"]).toContain("Georgia");
    expect(lightText["font-size"]).toBe("52");
    expect(lightText.x).toBe("130");
    expect(wordmarkMetrics(dark)).toEqual(wordmarkMetrics(light));
  });

  test("the icon reuses the master symbol rather than a redrawn shape", () => {
    const icon = readAsset(BRAND_ASSETS.icon);

    expect(geometry(icon)).toEqual(geometry(readAsset(BRAND_ASSETS.logoLight)));
    expect(attrsOf(icon, "polygon").fill).toBe(ORANGE);
    expect(attrsOf(icon, "path").stroke).toBe(FOREST);
    expect(icon).not.toContain("<text");
  });

  test("the icon is centred in a square viewBox", () => {
    const [x, y, width, height] = attrsOf(readAsset(BRAND_ASSETS.icon), "svg")
      .viewBox.split(/\s+/)
      .map(Number);

    expect(width).toBe(height);

    // Equal breathing room on each side, within a unit of the ink box's rounding.
    const left = SYMBOL_INK.left - x;
    const right = x + width - SYMBOL_INK.right;
    const top = SYMBOL_INK.top - y;
    const bottom = y + height - SYMBOL_INK.bottom;
    expect(Math.abs(left - right)).toBeLessThanOrEqual(1);
    expect(Math.abs(top - bottom)).toBeLessThanOrEqual(1);
    expect(Math.min(left, right, top, bottom)).toBeGreaterThan(0);
  });

  test("the favicon is the symbol on a dark green tile, with no text", () => {
    const favicon = readAsset(BRAND_ASSETS.favicon);

    expect(geometry(favicon)).toEqual(geometry(readAsset(BRAND_ASSETS.icon)));
    expect(attrsOf(favicon, "rect").fill).toBe(DARK_GREEN);
    expect(attrsOf(favicon, "path").stroke).toBe(IVORY);
    expect(attrsOf(favicon, "polygon").fill).toBe(ORANGE);

    // A wordmark at 16px is mud, and the brief rules text out of the favicon.
    expect(favicon).not.toMatch(/<text|<tspan/);
    expect(attrsOf(favicon, "svg").viewBox).toBe("0 0 48 48");
  });
});
