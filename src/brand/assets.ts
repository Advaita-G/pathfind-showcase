/**
 * The finalized Pathfind brand assets.
 *
 * The SVGs in `public/brand/` are the single source of truth for the mark: the two
 * lockups are the same geometry in two colourways, and the icon is the master symbol
 * with the wordmark dropped. `assets.test.ts` fails the build if any of that drifts,
 * so the components below never hold their own copy of the artwork.
 */
export const BRAND_ASSETS = {
  /** Ivory P/path + orange arrow + ivory wordmark — for the dark green hero/backgrounds. */
  logoDark: "/brand/pathfind-logo-dark.svg",
  /** Forest-green P/path + orange arrow + forest-green wordmark — for ivory backgrounds. */
  logoLight: "/brand/pathfind-logo-light.svg",
  /** The master symbol alone, square and centred, for small/tight placements. */
  icon: "/brand/pathfind-icon.svg",
  /** The icon on a dark green tile: legible on light and dark browser chrome. */
  favicon: "/favicon.svg",
} as const;

/** Intrinsic size of the master horizontal lockup (`viewBox="0 0 400 120"`). */
export const LOCKUP_WIDTH = 400;
export const LOCKUP_HEIGHT = 120;
