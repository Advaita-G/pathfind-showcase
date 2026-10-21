interface ShortcutEvent {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  target: unknown;
}

function isEditable(target: unknown): boolean {
  if (typeof target !== "object" || target === null) return false;
  const el = target as { tagName?: string; isContentEditable?: boolean };
  const tag = el.tagName?.toUpperCase();
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable === true;
}

/** True when a bare "/" keypress should focus the search box. */
export function isSearchShortcut(event: ShortcutEvent): boolean {
  if (event.key !== "/") return false;
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  return !isEditable(event.target);
}
