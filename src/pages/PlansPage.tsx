import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { OPPORTUNITIES } from "../data/opportunities";
import { useAuth } from "../context/AuthContext";
import { usePlans } from "../context/PlansContext";
import { usePathProfile } from "../lib/usePathProfile";
import { useToday } from "../lib/useToday";
import { useSeoMeta } from "../lib/useSeoMeta";
import { buildPlan, planProgress } from "../lib/planner/buildPlan";
import { siteUrl } from "../seo/meta";
import FooterLegal from "../components/FooterLegal";
import SeoPageHeader from "../components/SeoPageHeader";
import PlanDetail, { STATUS_LABEL } from "../components/PlanDetail";
import { canBackPlan } from "../lib/planner/buildPlan";
import { formatDeadline, daysUntil } from "../lib/formatDeadline";
import NextMove from "../components/NextMove";
import { useBookmarks } from "../lib/useBookmarks";
import { useIdeaProgress } from "../lib/useIdeaProgress";
import SyncSharePanel from "../components/SyncSharePanel";
import "../planner.css";

const BY_ID = new Map(OPPORTUNITIES.map((o) => [o.id, o]));

export default function PlansPage() {
  useSeoMeta({
    title: "Your Plans | Pathfind",
    description: "Your private Pathfind plans: step-by-step checklists, back-planned dates, and progress for the opportunities you chose. Sign in to sync them.",
    canonical: siteUrl("/plans"),
    robotsNoindex: true,
  });
  const { user, signInWithGoogle } = useAuth();
  const { plans, syncError, savePlan, removePlan } = usePlans();
  const { profile } = usePathProfile();
  const { bookmarks } = useBookmarks();
  const { ideaProgress, toggleStep: toggleIdeaStep } = useIdeaProgress();
  const today = useToday();
  const [params, setParams] = useSearchParams();
  const [openId, setOpenId] = useState<string | null>(null);
  const [showSync, setShowSync] = useState(false);
  const wanted = params.get("o");

  // "Plan this opportunity" links here with ?o=<id>: create the plan once, then open it.
  useEffect(() => {
    if (!wanted) return;
    const opportunity = BY_ID.get(wanted);
    if (opportunity && !plans[wanted]) savePlan(buildPlan(opportunity, profile, today));
    if (opportunity) setOpenId(wanted);
    setParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanted]);

  const list = useMemo(
    () => Object.values(plans)
      .filter((p) => BY_ID.has(p.opportunityId))
      .sort((a, b) => Number(a.status === "done" || a.status === "dropped") - Number(b.status === "done" || b.status === "dropped") || b.updatedAt.localeCompare(a.updatedAt)),
    [plans],
  );
  const selected = list.find((p) => p.opportunityId === openId) ?? list[0];
  const totals = list.reduce((acc, p) => { const r = planProgress(p); return { done: acc.done + r.done, total: acc.total + r.total }; }, { done: 0, total: 0 });

  return (
    <div className="profile-page plans-page">
      <SeoPageHeader />
      <main className="plans-main">
        <Link to="/" className="profile-page-back">← Back to Pathfind</Link>
        <header className="plans-hero">
          <p className="profile-page-kicker">Plan · Track · Apply</p>
          <h1>Your plans</h1>
          <p>{list.length === 0 ? "Pick an opportunity and choose “Plan this opportunity” to get a checklist you can edit." : `${list.length} plan${list.length === 1 ? "" : "s"} · ${totals.done} of ${totals.total} steps done`}</p>
          {user && list.length > 0 && (
            <button type="button" className="plan-ghost plans-sync-toggle" aria-expanded={showSync} onClick={() => setShowSync((v) => !v)}>Calendar &amp; sharing</button>
          )}
        </header>

        {!user && (
          <p className="plans-banner">
            Plans are saved on this device. <button type="button" className="plan-linkbtn" onClick={signInWithGoogle}>Sign in with Google</button> to keep them across devices, sync a calendar, or share your path.
          </p>
        )}
        {syncError && <p className="plans-banner plans-banner--warn" role="status">{syncError}</p>}

        <NextMove profile={profile} bookmarks={bookmarks} ideaProgress={ideaProgress} onToggleIdeaStep={toggleIdeaStep} />

        {list.length === 0 ? (
          <div className="plans-empty">
            <p>No plans yet.</p>
            <Link to="/opportunities" className="profile-page-primary">Find an opportunity</Link>
          </div>
        ) : (
          <div className="plans-layout">
            <nav className="plans-list" aria-label="Your plans">
              {list.map((plan) => {
                const o = BY_ID.get(plan.opportunityId)!;
                const r = planProgress(plan);
                const active = plan.opportunityId === selected?.opportunityId;
                return (
                  <button key={plan.opportunityId} type="button" className={`plan-card${active ? " is-open" : ""}`} aria-current={active ? "true" : undefined} onClick={() => setOpenId(plan.opportunityId)}>
                    <span className="plan-card-org">{o.org}</span>
                    <strong>{o.title}</strong>
                    <span className="plan-card-meta">
                      <span className="plan-status">{STATUS_LABEL[plan.status]}</span>
                      <span className="plan-progress" role="img" aria-label={`${r.done} of ${r.total} steps done`}><span style={{ width: `${r.percent}%` }} /></span>
                      <span className="plan-card-count">{r.done}/{r.total}</span>
                    </span>
                    {canBackPlan(o, today) && <span className="plan-card-next">{daysUntil(o.deadline as string, today)} days left · {formatDeadline(o.deadline as string)}</span>}
                  </button>
                );
              })}
            </nav>
            {selected && (
              <PlanDetail
                key={selected.opportunityId}
                opportunity={BY_ID.get(selected.opportunityId)!}
                plan={selected}
                profile={profile}
                today={today}
                onChange={savePlan}
                onRemove={() => removePlan(selected.opportunityId)}
              />
            )}
          </div>
        )}

        {user && list.length > 0 && showSync && <SyncSharePanel />}
      </main>
      <FooterLegal />
    </div>
  );
}
