import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { OPPORTUNITIES } from "../data/opportunities";
import { fetchSharedPath, type SharedPath } from "../lib/planner/pathLinks";
import { formatDeadline } from "../lib/formatDeadline";
import { useSeoMeta } from "../lib/useSeoMeta";
import { siteUrl } from "../seo/meta";
import SeoPageHeader from "../components/SeoPageHeader";
import TrustBadge from "../components/TrustBadge";
import "../planner.css";

const BY_ID = new Map(OPPORTUNITIES.map((o) => [o.id, o]));

export default function SharedPathPage() {
  useSeoMeta({
    title: "Shared Path | Pathfind",
    description: "A read-only view of a student's Pathfind opportunities and progress, shared by link. The student can turn this link off at any time.",
    canonical: siteUrl("/shared"),
    robotsNoindex: true,
  });
  const [state, setState] = useState<"loading" | "missing" | SharedPath>("loading");

  useEffect(() => {
    // The token sits in the URL hash so it is never sent to a server or in a Referer header.
    const token = window.location.hash.slice(1);
    if (!token) { setState("missing"); return; }
    fetchSharedPath(token).then((d) => setState(d ?? "missing"));
  }, []);

  return (
    <div className="profile-page plans-page">
      <SeoPageHeader />
      <main className="plans-main">
        {state === "loading" && <p className="profile-page-status">Loading…</p>}
        {state === "missing" && (
          <div className="plans-empty">
            <h1>This link is not available</h1>
            <p>It may have been turned off, or it is mistyped. Ask the student for a new link.</p>
            <Link to="/" className="profile-page-primary">Go to Pathfind</Link>
          </div>
        )}
        {typeof state === "object" && (
          <>
            <header className="plans-hero">
              <p className="profile-page-kicker">Shared with you · read only</p>
              <h1>{state.first_name ? `${state.first_name}'s path` : "A student's path"}</h1>
              <p>{state.grade ? `Grade ${state.grade} · ` : ""}{state.plans.length} opportunit{state.plans.length === 1 ? "y" : "ies"} planned</p>
            </header>
            <div className="plans-list">
              {state.plans.filter((p) => BY_ID.has(p.opportunity_id)).map((p) => {
                const o = BY_ID.get(p.opportunity_id)!;
                const done = p.steps.filter((s) => s.done).length;
                return (
                  <article key={p.opportunity_id} className="plan-card is-open">
                    <div className="plan-card-head">
                      <span className="plan-card-title"><span className="plan-card-org">{o.org}</span><strong>{o.title}</strong></span>
                      <span className="plan-card-meta"><span className="plan-status">{p.status}</span><span className="plan-card-count">{done}/{p.steps.length}</span></span>
                    </div>
                    <div className="plan-card-body">
                      <div className="plan-row"><TrustBadge opportunity={o} /><a className="plan-link" href={o.link} target="_blank" rel="noopener noreferrer">Official page ↗</a></div>
                      <ul className="plan-steps">
                        {p.steps.map((s) => (
                          <li key={s.id} className={`plan-step${s.done ? " is-done" : ""}`}>
                            <span className="plan-step-check"><input type="checkbox" checked={s.done} readOnly disabled aria-label={s.title} /><span>{s.title}</span></span>
                            <span className={`step-tag step-tag--${s.kind === "official" ? "official" : "suggested"}`}>{s.kind === "official" ? "Program" : "Suggestion"}</span>
                            {s.due && <span className="plan-step-date">{formatDeadline(s.due)}</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
