import { useState } from "react";
import { Link } from "react-router-dom";
import type { Opportunity } from "../data/types";
import { useAssistant } from "../context/AssistantContext";
import { downloadDeadlineCalendar } from "../lib/calendarExport";
import { daysUntil, formatDeadline } from "../lib/formatDeadline";
import type { PathProfile } from "../lib/usePathProfile";
import { assessTiming, canBackPlan, nextStep, planProgress, refreshPlanDates, stepHours, tierOf, unknownFacts } from "../lib/planner/buildPlan";
import type { OpportunityPlan, PlanStatus, PlanStep } from "../lib/planner/types";
import { MAX_STEPS } from "../lib/planner/types";
import TrustBadge from "./TrustBadge";
import FitList from "./FitList";

export const STATUS_LABEL: Record<PlanStatus, string> = {
  planning: "Planning", applying: "Applying", applied: "Applied", done: "Done", dropped: "Dropped",
};

interface Props {
  opportunity: Opportunity;
  plan: OpportunityPlan;
  profile: PathProfile | null;
  today: Date;
  onChange: (plan: OpportunityPlan) => void;
  onRemove: () => void;
}

type Panel = "add" | "notes" | "fit" | null;

function timingNote(o: Opportunity, today: Date): string {
  if (canBackPlan(o, today)) return "";
  if (o.deadline && o.deadlineConfirmed === false) return "The deadline is only an estimate, so these steps have no dates. Add your own if you like.";
  if (o.deadline && daysUntil(o.deadline, today) === 0) return "The deadline is today, so steps have no dates. Check the official page and submit what you can today.";
  if (o.deadline) return "This cycle's deadline has passed, so steps have no dates. Check the official site for the next cycle.";
  return "No deadline is published, so steps have no dates. You can add your own.";
}

function bucketOf(s: PlanStep, today: Date): string {
  if (!s.due) return "No date";
  const d = daysUntil(s.due, today);
  if (d < 0) return s.done ? "Earlier" : "Overdue";
  if (d < 7) return "This week";
  if (d < 14) return "Next week";
  const [y, m] = s.due.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function tagOf(s: PlanStep): { cls: string; label: string } {
  if (s.kind === "official") return { cls: "official", label: "Program requirement" };
  const t = tierOf(s);
  return t === "must" ? { cls: "suggested", label: "Essential tip" } : t === "optional" ? { cls: "suggested", label: "Optional" } : { cls: "suggested", label: "Suggestion" };
}

function hoursText(h: number): string {
  return h <= 0 ? "" : h < 1 ? "est. ~30 min" : `est. ~${h % 1 ? h.toFixed(1) : h} h`;
}

export default function PlanDetail({ opportunity, plan: raw, profile, today, onChange, onRemove }: Props) {
  const plan = refreshPlanDates(raw, opportunity, today, profile);
  const { ask } = useAssistant();
  const [panel, setPanel] = useState<Panel>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [newStep, setNewStep] = useState("");
  const { done, total, percent } = planProgress(plan);
  const dated = canBackPlan(opportunity, today);
  const timing = assessTiming(plan, opportunity, profile, today);
  const skipped = timing.infeasible;
  const next = nextStep(plan, skipped);
  const update = (patch: Partial<OpportunityPlan>) => onChange({ ...plan, ...patch });
  const setStep = (id: string, patch: Partial<PlanStep>) => update({ steps: plan.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  const sorted = plan.steps.filter((s) => !skipped.has(s.id)).sort((a, b) => (a.due && b.due ? a.due.localeCompare(b.due) : a.due ? -1 : b.due ? 1 : 0));
  const note = timingNote(opportunity, today);
  const togglePanel = (p: Exclude<Panel, null>) => setPanel((cur) => (cur === p ? null : p));

  // Timeline strip: today → deadline, each dated step placed by its real date.
  const span = dated ? Math.max(1, daysUntil(opportunity.deadline as string, today)) : 1;
  const pos = (due: string) => `${Math.min(100, Math.max(0, (daysUntil(due, today) / span) * 100))}%`;

  const row = (s: PlanStep) => {
    const late = Boolean(s.due) && !s.done && daysUntil(s.due as string, today) < 0;
    const h = hoursText(stepHours(s));
    return (
      <li key={s.id} className={`plan-step${s.done ? " is-done" : ""}${next?.id === s.id ? " is-next" : ""}`}>
        <span className="plan-step-dot" aria-hidden="true" />
        <label className="plan-step-check">
          <input type="checkbox" checked={s.done} onChange={(e) => setStep(s.id, { done: e.target.checked })} />
          <span>{s.title}</span>
        </label>
        <span className="plan-step-meta">
          <span className={`step-tag step-tag--${tagOf(s).cls}`}>{tagOf(s).label}</span>
          {s.due && <span className={`plan-step-due${late ? " is-late" : ""}`}>{formatDeadline(s.due)}</span>}
          {h && <span className="plan-step-hours">{h}</span>}
          <button type="button" className="plan-step-edit" aria-expanded={editing === s.id} aria-label={`Edit ${s.title}`} onClick={() => setEditing((e) => (e === s.id ? null : s.id))}>Edit</button>
        </span>
        {editing === s.id && (
          <span className="plan-step-editor">
            {s.kind === "suggested" && (
              <label>
                <span>Step</span>
                <input type="text" value={s.title} maxLength={200} aria-label={`Rename ${s.title}`} onChange={(e) => setStep(s.id, { title: e.target.value || s.title })} />
              </label>
            )}
            <label>
              <span>Date</span>
              <input
                type="date"
                value={s.due ?? ""}
                aria-label={`Date for ${s.title}`}
                onChange={(e) => {
                  const { due: _d, ...rest } = s;
                  update({ steps: plan.steps.map((x) => (x.id === s.id ? (e.target.value ? { ...rest, due: e.target.value, dueEdited: true } : { ...rest, dueEdited: true }) : x)) });
                }}
              />
            </label>
            {s.kind === "suggested" && (
              <button type="button" className="plan-ghost plan-ghost--danger" aria-label={`Remove ${s.title}`} onClick={() => update({ steps: plan.steps.filter((x) => x.id !== s.id) })}>Remove step</button>
            )}
          </span>
        )}
      </li>
    );
  };

  return (
    <article className="plan-detail" aria-label={opportunity.title}>
      <header className="plan-detail-head">
        <div className="plan-detail-title">
          <span className="plan-card-org">{opportunity.org}</span>
          <h2>{opportunity.title}</h2>
          <div className="plan-row">
            <TrustBadge opportunity={opportunity} today={today} />
            <a href={opportunity.sourceUrl ?? opportunity.link} target="_blank" rel="noopener noreferrer" className="plan-link">Official page ↗</a>
            <Link to={`/opportunities/${opportunity.id}`} className="plan-link">Details</Link>
            <button
              type="button"
              className="plan-linkbtn"
              onClick={() => ask(`Help me prepare my application for ${opportunity.title}.`, [opportunity.id])}
            >
              Ask Pathfind
            </button>
            {opportunity.deadline && daysUntil(opportunity.deadline, today) >= 0 && (
              <button
                type="button"
                className="plan-linkbtn"
                onClick={() => downloadDeadlineCalendar(opportunity)}
              >
                Add deadline to calendar
              </button>
            )}
          </div>
        </div>
        <div className="plan-detail-side">
          {dated && (
            <p className="plan-deadline"><strong>{timing.daysLeft}</strong> day{timing.daysLeft === 1 ? "" : "s"} left<span>Deadline {formatDeadline(opportunity.deadline as string)}</span></p>
          )}
          <label className="plan-status-select">
            <span className="visually-hidden">Status</span>
            <select value={plan.status} onChange={(e) => update({ status: e.target.value as PlanStatus })}>
              {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
        </div>
      </header>

      {timing.message && <p className={`plan-warn plan-warn--${timing.level}`} role="status">{timing.message}</p>}
      {note && <p className="plan-note">{note}</p>}

      <section className="plan-next" aria-label="Next action">
        {next ? (
          <>
            <div>
              <span className="plan-next-label">Do this next</span>
              <strong>{next.title}</strong>
              <span className="plan-next-sub">{next.due ? `Due ${formatDeadline(next.due)}` : "No date set"}{hoursText(stepHours(next)) ? ` · ${hoursText(stepHours(next))}` : ""}</span>
            </div>
            <button type="button" className="plan-next-done" onClick={() => setStep(next.id, { done: true })}>Mark done</button>
          </>
        ) : (
          <div><span className="plan-next-label">All steps done</span><strong>Nice work. Check the official page for any last items.</strong></div>
        )}
      </section>

      <div className="plan-progress-line">
        <span className="plan-progress" role="img" aria-label={`${done} of ${total} steps done`}><span style={{ width: `${percent}%` }} /></span>
        <span className="plan-card-count">{done}/{total} done · {percent}%</span>
      </div>

      <p className="plan-note">
        Still open: {(["must", "recommended", "optional"] as const).map((t) => `${plan.steps.filter((s) => !s.done && !skipped.has(s.id) && tierOf(s) === t).length} ${t === "must" ? "must-do" : t}`).join(" · ")}{skipped.size ? ` · ${skipped.size} won't fit` : ""}
      </p>

      {dated && (
        <div className="plan-track" aria-hidden="true">
          <span className="plan-track-line" />
          {sorted.filter((s) => s.due).map((s) => <span key={s.id} className={`plan-track-dot${s.done ? " is-done" : ""}`} style={{ left: pos(s.due as string) }} />)}
          <span className="plan-track-end" />
          <span className="plan-track-label plan-track-label--start">Today</span>
          <span className="plan-track-label plan-track-label--end">{formatDeadline(opportunity.deadline as string)}</span>
        </div>
      )}

      <p className="plan-legend">
        <span className="step-tag step-tag--official">Program requirement</span> from the program's record
        <span className="step-tag step-tag--suggested">Suggestion</span> a generic Pathfind tip, not a requirement
        <span>Time estimates are rough guesses.</span>
      </p>

      <p className="plan-note">Not stated in Pathfind's record: {unknownFacts(opportunity).join("; ")}. Check the <a href={opportunity.sourceUrl ?? opportunity.link} target="_blank" rel="noopener noreferrer">official page</a>.</p>

      {[...new Set(sorted.map((s) => bucketOf(s, today)))].map((b) => {
        const items = sorted.filter((s) => bucketOf(s, today) === b);
        return (
          <section key={b} className="plan-group">
            <h3 className={b === "Overdue" ? "is-late" : ""}>{b}</h3>
            <ul className="plan-steps">{items.map(row)}</ul>
          </section>
        );
      })}

      {skipped.size > 0 && (
        <section className="plan-group plan-wontfit" aria-label="Won't fit">
          <h3 className="is-late">Won't fit before the deadline</h3>
          <ul className="plan-steps">
            {plan.steps.filter((s) => skipped.has(s.id)).map((s) => (
              <li key={s.id} className="plan-step">
                <span className="plan-step-dot" aria-hidden="true" />
                <span className="plan-step-check"><span>{s.title}</span></span>
                <span className="plan-step-meta"><span className="plan-step-due is-late">{skipped.get(s.id)?.reason}</span></span>
                <span className="plan-next-sub">{skipped.get(s.id)?.alternative}</span>
                <span className="plan-step-editor">
                  <label><span>Pick your own date</span>
                    <input type="date" aria-label={`Date for ${s.title}`} onChange={(e) => e.target.value && setStep(s.id, { due: e.target.value, dueEdited: true })} />
                  </label>
                  <button type="button" className="plan-ghost plan-ghost--danger" aria-label={`Remove ${s.title}`} onClick={() => update({ steps: plan.steps.filter((x) => x.id !== s.id) })}>Remove step</button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="plan-actions" role="group" aria-label="More options">
        {plan.steps.length < MAX_STEPS && <button type="button" className="plan-ghost" aria-expanded={panel === "add"} onClick={() => togglePanel("add")}>Add a step</button>}
        <button type="button" className="plan-ghost" aria-expanded={panel === "notes"} onClick={() => togglePanel("notes")}>Notes{plan.notes ? " •" : ""}</button>
        <button type="button" className="plan-ghost" aria-expanded={panel === "fit"} onClick={() => togglePanel("fit")}>Why it fits you</button>
        <button type="button" className="plan-ghost plan-ghost--danger" onClick={onRemove}>Remove plan</button>
      </div>

      {panel === "add" && (
        <form
          className="plan-add"
          onSubmit={(e) => {
            e.preventDefault();
            const title = newStep.trim();
            if (!title) return;
            update({ steps: [...plan.steps, { id: `c-${Date.now().toString(36)}`, title: title.slice(0, 200), kind: "suggested", done: false }] });
            setNewStep("");
          }}
        >
          <input value={newStep} maxLength={200} onChange={(e) => setNewStep(e.target.value)} placeholder="Add your own step" aria-label="Add your own step" autoFocus />
          <button type="submit">Add</button>
        </form>
      )}
      {panel === "notes" && (
        <label className="plan-notes">
          <span>Private notes (never shared)</span>
          <textarea value={plan.notes} maxLength={2000} rows={4} onChange={(e) => update({ notes: e.target.value })} />
        </label>
      )}
      {panel === "fit" && <FitList opportunity={opportunity} />}
    </article>
  );
}
