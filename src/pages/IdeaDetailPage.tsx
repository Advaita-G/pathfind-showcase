import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, Bookmark, Check } from "lucide-react";
import { DEMO_PATHFIND_IDEAS } from "../data/pathfindIdeas";
import { OPPORTUNITIES } from "../data/opportunities";
import { useIdeaProgress } from "../lib/useIdeaProgress";
import SeoPageHeader from "../components/SeoPageHeader";
import NotFoundPage from "./NotFoundPage";
import { useSeoMeta } from "../lib/useSeoMeta";
import { ideaMeta, notFoundMeta } from "../seo/meta";
import "../idea-page.css";

export default function IdeaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const idea = DEMO_PATHFIND_IDEAS.find((i) => i.id === id);
  const { ideaProgress, toggleSaved, toggleStep } = useIdeaProgress();
  useSeoMeta(idea ? ideaMeta(idea) : notFoundMeta());
  if (!idea) return <NotFoundPage />;

  const saved = ideaProgress.ideas[idea.id]?.saved === true;
  const done = ideaProgress.ideas[idea.id]?.completedSteps ?? [];
  const total = idea.roadmap.length;
  const percent = total ? Math.round((done.length / total) * 100) : 0;
  const nextIndex = idea.roadmap.findIndex((_, i) => !done.includes(i));
  const related = idea.relatedOpportunityIds.map((rid) => OPPORTUNITIES.find((o) => o.id === rid)).filter((o) => o !== undefined);
  const facts: [string, string][] = [
    ["Time", `${idea.weeklyHours} a week`],
    ["Length", idea.duration],
    ["Cost", idea.cost],
    ["Level", idea.difficulty],
    ...(idea.teamSize ? [["Works as", idea.teamSize === "either" ? "Solo or a team" : idea.teamSize === "team" ? "A team" : "Solo"] as [string, string]] : []),
  ];

  return (
    <div className="seo-page">
      <SeoPageHeader />
      <main className="content idea-page">
        <Link to="/" className="idea-back"><ArrowLeft size={15} aria-hidden="true" />Back to my path</Link>

        <header className="idea-hero">
          <p className="idea-badge">Pathfind idea · not a verified program</p>
          <h1>{idea.title}</h1>
          <p className="idea-lede">{idea.summary}</p>
          <dl className="idea-facts">
            {facts.map(([k, v]) => (
              <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
            ))}
          </dl>
        </header>

        <div className="idea-layout">
          <div className="idea-main">
            <section className="idea-start" aria-labelledby="idea-start-h">
              <h2 id="idea-start-h">Start here</h2>
              <p>{idea.firstStep}</p>
            </section>

            <section aria-labelledby="idea-about-h">
              <h2 id="idea-about-h">What this is</h2>
              <p>{idea.description}</p>
              {idea.problem && <p><strong>The problem.</strong> {idea.problem}</p>}
              <p><strong>{idea.whoItHelps ? "Who it helps." : "Why it could matter."}</strong> {idea.whoItHelps ?? idea.potentialImpact}</p>
              {idea.whoItHelps && <p><strong>What it can change.</strong> {idea.potentialImpact}</p>}
            </section>

            <section aria-labelledby="idea-road-h">
              <div className="idea-road-head">
                <h2 id="idea-road-h">Step by step</h2>
                <span className="idea-count" aria-live="polite">{done.length} of {total} done</span>
              </div>
              <ol className="idea-road">
                {idea.roadmap.map((step, i) => {
                  const complete = done.includes(i);
                  return (
                    <li key={i} className={`${complete ? "is-done" : ""}${i === nextIndex ? " is-next" : ""}`}>
                      <label>
                        <input type="checkbox" checked={complete} onChange={() => toggleStep(idea.id, i)} aria-label={`${complete ? "Mark incomplete" : "Mark done"}: ${step}`} />
                        <span className="idea-check" aria-hidden="true">{complete && <Check size={13} />}</span>
                        <span className="idea-step-text">{step}{i === nextIndex && <em>Next</em>}</span>
                      </label>
                    </li>
                  );
                })}
              </ol>
            </section>

            <section aria-labelledby="idea-out-h">
              <h2 id="idea-out-h">What you will finish with</h2>
              <ul className="idea-list">{idea.deliverables.map((d) => <li key={d}>{d}</li>)}</ul>
              {idea.stretchGoal && <p><strong>Stretch goal.</strong> {idea.stretchGoal}</p>}
              {idea.portfolioValue && <p><strong>What it shows others.</strong> {idea.portfolioValue}</p>}
            </section>
          </div>

          <aside className="idea-side" aria-label="Your progress and requirements">
            <div className="idea-card">
              <div className="idea-progress-top"><strong>{percent}%</strong><span>{done.length}/{total} steps</span></div>
              <div className="idea-bar" role="progressbar" aria-label="Project progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><span style={{ transform: `scaleX(${percent / 100})` }} /></div>
              <button type="button" className={`idea-save${saved ? " is-saved" : ""}`} aria-pressed={saved} onClick={() => toggleSaved(idea.id)}>
                <Bookmark size={16} fill={saved ? "currentColor" : "none"} aria-hidden="true" />{saved ? "Saved to my path" : "Save to my path"}
              </button>
            </div>
            <div className="idea-card">
              <h3>Bring</h3>
              <p>{idea.skillsRequired.join(" · ")}</p>
              <h3>You will build</h3>
              <p>{idea.skillsYouWillLearn.join(" · ")}</p>
              {idea.tools && idea.tools.length > 0 && (<><h3>Tools</h3><p>{idea.tools.join(" · ")}</p></>)}
              {idea.dataSource && (<><h3>Data</h3><p>{idea.dataSource}</p></>)}
            </div>
          </aside>
        </div>

        {related.length > 0 && (
          <section className="idea-related" aria-labelledby="idea-rel-h">
            <h2 id="idea-rel-h">Verified programs that build the same skills</h2>
            <ul>
              {related.map((o) => (
                <li key={o.id}><Link to={`/opportunities/${o.id}`}><strong>{o.title}</strong><span>{o.org}</span><ArrowUpRight size={15} aria-hidden="true" /></Link></li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
