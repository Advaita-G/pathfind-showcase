import { useEffect, useState } from "react";
import { activeLinkKinds, calendarFeedUrl, createPathLink, revokePathLink, shareUrl, type LinkKind } from "../lib/planner/pathLinks";

/** Creates or turns off the two private links. A raw token is only shown right after it is made. */
export default function SyncSharePanel() {
  const [active, setActive] = useState<LinkKind[]>([]);
  const [fresh, setFresh] = useState<Partial<Record<LinkKind, string>>>({});
  const [busy, setBusy] = useState<LinkKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<LinkKind | null>(null);
  const [shown, setShown] = useState<LinkKind | null>(null);

  useEffect(() => { activeLinkKinds().then(setActive); }, []);

  const make = async (kind: LinkKind) => {
    setBusy(kind); setError(null);
    try {
      const token = await createPathLink(kind);
      setFresh((f) => ({ ...f, [kind]: kind === "share" ? shareUrl(token) : calendarFeedUrl(token) }));
      setActive((a) => (a.includes(kind) ? a : [...a, kind]));
    } catch (e) { setError((e as Error).message); } finally { setBusy(null); }
  };
  const off = async (kind: LinkKind) => {
    setBusy(kind); setError(null);
    try {
      await revokePathLink(kind);
      setActive((a) => a.filter((k) => k !== kind));
      setFresh((f) => ({ ...f, [kind]: undefined }));
    } catch (e) { setError((e as Error).message); } finally { setBusy(null); }
  };
  const copy = async (kind: LinkKind) => {
    const url = fresh[kind];
    if (!url) return;
    try { await navigator.clipboard.writeText(url); setCopied(kind); setTimeout(() => setCopied(null), 1800); }
    catch { setError("Could not copy. Select the link and copy it by hand."); }
  };

  const row = (kind: LinkKind, title: string, blurb: string) => (
    <div className="sync-row">
      <div>
        <h3>{title}</h3>
        <p>{blurb}</p>
        {fresh[kind] && (
          <div className="sync-link">
            <input readOnly type={shown === kind ? "text" : "password"} autoComplete="off" value={fresh[kind]} aria-label={`${title} link`} onFocus={(e) => e.currentTarget.select()} />
            <button type="button" className="plan-ghost" aria-pressed={shown === kind} onClick={() => setShown((k) => (k === kind ? null : kind))}>{shown === kind ? "Hide" : "Show"}</button>
            <button type="button" onClick={() => copy(kind)}>{copied === kind ? "Copied" : "Copy"}</button>
          </div>
        )}
        {active.includes(kind) && !fresh[kind] && <p className="sync-hint">A link is on. For safety it is shown only once. Make a new one to see it again (this turns the old one off).</p>}
      </div>
      <div className="sync-actions">
        <button type="button" disabled={busy !== null} onClick={() => make(kind)}>{active.includes(kind) ? "Make new link" : "Turn on"}</button>
        {active.includes(kind) && <button type="button" className="plan-ghost plan-ghost--danger" disabled={busy !== null} onClick={() => off(kind)}>Turn off</button>}
      </div>
    </div>
  );

  return (
    <section className="sync-panel" aria-label="Calendar and sharing">
      <p className="sync-hint">Each link is private. It is hidden by default and shown only once, right after you make it.</p>
      {row("calendar", "Live calendar", "Subscribe in Google, Apple, or Outlook Calendar. Deadlines and dated steps update on their own. Anyone with the link can see your dates, so keep it private.")}
      {row("share", "Share my path", "A read-only page for a parent, counselor, or friend. It shows your first name, grade, chosen opportunities, and step progress. Never notes, email, or school.")}
      {error && <p className="sync-error" role="alert">{error}</p>}
    </section>
  );
}
