/**
 * True when React is about to hydrate server-rendered markup rather than mount into an
 * empty root.
 *
 * Prerendered pages ship their HTML inside `#root`, so a hook that renders from a
 * browser-only source (localStorage, the current date) would produce different markup
 * than the server did and React would report a hydration mismatch. On the homepage —
 * which is never prerendered — `#root` is empty, so those hooks can read synchronously
 * and avoid a visible flicker.
 */
export function isHydrating(): boolean {
  if (typeof document === "undefined") return true;
  return Boolean(document.getElementById("root")?.hasChildNodes());
}
