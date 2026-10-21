import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Bookmark, Check, CircleCheck, Plus, Sparkle } from "lucide-react";
import { INTERESTS, type Interest, type Opportunity } from "../data/types";
import { DEMO_PATHFIND_IDEAS, type PathfindIdea } from "../data/pathfindIdeas";
import { daysUntil, formatDeadline } from "../lib/formatDeadline";
import { expectedToReopen, getOpportunityStatus } from "../lib/opportunityStatus";
import { participationMatchNote } from "../lib/participation";
import { trackOpportunityAction } from "../lib/analytics";

const INTEREST_LABELS = new Map(INTERESTS.map((item) => [item.id, item.label]));
const numberFormatter = new Intl.NumberFormat("en-US");

/** Short, honest deadline wording: confirmed, estimated, not announced, and closed never look alike. */
function deadlineMeta(opportunity: Opportunity): { label: string; urgent: boolean } {
  const status = getOpportunityStatus(opportunity);
  switch (status) {
    case "INACTIVE":
      return { label: "No longer running", urgent: false };
    case "DEADLINE_PASSED":
      return { label: expectedToReopen(opportunity) ? "Closed · reopens next cycle" : "Closed", urgent: false };
    case "UNKNOWN":
      return { label: "Next cycle not announced", urgent: false };
    case "RECURRING":
      return { label: "Rolling", urgent: false };
    case "UPCOMING":
      return { label: `Opens ${formatDeadline(opportunity.applicationOpenDate!)}`, urgent: false };
    case "OPEN": {
      const deadline = opportunity.deadline!;
      const prefix = opportunity.deadlineConfirmed === false ? "Est. due" : "Due";
      return { label: `${prefix} ${formatDeadline(deadline)}`, urgent: daysUntil(deadline) <= 30 };
    }
  }
}

/** "AI + Biology" for the interests a student picked that this program is actually tagged with. */
function matchNote(opportunity: Opportunity, interests: string[]): string | null {
  const shared = opportunity.interests.filter((id) => interests.includes(id));
  if (shared.length === 0) return null;
  return shared.map((id) => INTEREST_LABELS.get(id as Interest) ?? id).join(" + ");
}

/** A real, externally hosted program. Flat row on a shared hairline; green means verified. */
export function OpportunityRow({
  opportunity,
  interests,
  saved,
  onToggleSaved,
}: {
  opportunity: Opportunity;
  interests: string[];
  saved?: boolean;
  onToggleSaved?: () => void;
}) {
  const deadline = deadlineMeta(opportunity);
  const why = matchNote(opportunity, interests);
  const participation = participationMatchNote(opportunity);
  return (
    <motion.article
      className="path-row"
      layout="position"
      initial={{ y: 8 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.22 }}
    >
      <div className="path-row-main">
        <h4>
          <Link to={`/opportunities/${opportunity.id}`} onClick={() => trackOpportunityAction(opportunity.id)}>
            {opportunity.title}
          </Link>
        </h4>
        <div className="path-row-org">
          {opportunity.org} ·{" "}
          <a href={opportunity.link} target="_blank" rel="noreferrer" onClick={() => trackOpportunityAction(opportunity.id)}>
            Official site <ArrowUpRight size={12} aria-hidden="true" />
          </a>
          {!opportunity.inactive && (
            <>
              {" "}· <Link to={`/plans?o=${encodeURIComponent(opportunity.id)}`}>Plan</Link>
            </>
          )}
        </div>
        <p className={`path-row-deadline${deadline.urgent ? " is-urgent" : ""}`}>{deadline.label}</p>
        {why && <p className="path-row-why">Matches {why}</p>}
        {participation && <p className="path-row-note">{participation}</p>}
      </div>
      {onToggleSaved && (
        <button
          type="button"
          className={`path-icon-btn${saved ? " is-active" : ""}`}
          aria-pressed={saved}
          aria-label={`${saved ? "Unsave" : "Save"} ${opportunity.title}`}
          onClick={onToggleSaved}
        >
          <Bookmark size={16} fill={saved ? "currentColor" : "none"} aria-hidden="true" />
        </button>
      )}
    </motion.article>
  );
}

/** A Pathfind-written project idea, never an external program. Short on purpose; the full plan opens in the path view. */
function IdeaPreviewCard({ idea, saved, onToggleSaved }: { idea: PathfindIdea; saved: boolean; onToggleSaved: () => void }) {
  return (
    <motion.article className="path-idea-mini" layout="position" initial={{ y: 8 }} animate={{ y: 0 }} transition={{ duration: 0.22 }}>
      <h4>{idea.title}</h4>
      <p>{DEMO_PATHFIND_IDEAS.find((item) => item.id === idea.id)?.summary ?? idea.summary}</p>
      <p className="path-idea-mini-meta">{idea.weeklyHours}/week · {idea.cost}</p>
      <div className="path-idea-mini-actions">
        <button type="button" className={`path-btn${saved ? " is-secondary" : ""}`} aria-pressed={saved} onClick={onToggleSaved}>
          {saved ? <Check size={14} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
          {saved ? "On your path" : "Add to my path"}
        </button>
      </div>
    </motion.article>
  );
}

export interface PathPreviewProps {
  hasMatchFilters: boolean;
  catalogTotal: number;
  opportunityCount: number;
  ideaCount: number;
  interests: string[];
  verified: Opportunity[];
  ideas: PathfindIdea[];
  isIdeaSaved: (ideaId: string) => boolean;
  savedOpportunityIds: string[];
  onToggleIdeaSaved: (ideaId: string) => void;
  onToggleSavedOpportunity?: (opportunityId: string) => void;
  onExplore: () => void;
}

/** Right pane: the path as it stands right now. Every number here is computed from the real catalog. */
export default function PathPreview({
  hasMatchFilters,
  catalogTotal,
  opportunityCount,
  ideaCount,
  interests,
  verified,
  ideas,
  isIdeaSaved,
  savedOpportunityIds,
  onToggleIdeaSaved,
  onToggleSavedOpportunity,
  onExplore,
}: PathPreviewProps) {
  const shownVerified = verified.slice(0, 2);
  const shownIdea = ideas[0];
  const showIdeaCount = hasMatchFilters && interests.length > 0;

  return (
    <div className="path-pane">
      <p className="path-pane-count" role="status" aria-live="polite" aria-atomic="true">
        {hasMatchFilters ? (
          <>
            <span>
              <strong>{numberFormatter.format(opportunityCount)}</strong>
              {opportunityCount === 1 ? "opportunity matches" : "opportunities match"}
            </span>
            {showIdeaCount && (
              <span>
                <strong>{numberFormatter.format(ideaCount)}</strong>
                {ideaCount === 1 ? "idea matches" : "ideas match"}
              </span>
            )}
          </>
        ) : (
          <span>
            <strong>{numberFormatter.format(catalogTotal)}</strong>
            opportunities in the catalog
          </span>
        )}
      </p>

      <div className="path-pane-section">
        <h3 className="path-section-title is-verified"><CircleCheck size={15} aria-hidden="true" />Verified opportunities</h3>
        {shownVerified.length > 0 ? (
          <div className="path-row-list">
            {shownVerified.map((opportunity) => (
              <OpportunityRow
                key={opportunity.id}
                opportunity={opportunity}
                interests={interests}
                saved={savedOpportunityIds.includes(opportunity.id)}
                onToggleSaved={onToggleSavedOpportunity ? () => onToggleSavedOpportunity(opportunity.id) : undefined}
              />
            ))}
          </div>
        ) : (
          <div className="path-empty">
            <p className="path-empty-title">Pick an interest or a goal.</p>
            <p>Real programs that fit you show up here as you choose.</p>
          </div>
        )}
      </div>

      {shownIdea && (
        <div className="path-pane-section">
          <h3 className="path-section-title is-generated"><Sparkle size={15} aria-hidden="true" />A Pathfind idea</h3>
          <IdeaPreviewCard idea={shownIdea} saved={isIdeaSaved(shownIdea.id)} onToggleSaved={() => onToggleIdeaSaved(shownIdea.id)} />
        </div>
      )}

      <button type="button" className="path-explore" onClick={onExplore}>
        <span>{hasMatchFilters ? `Explore all ${numberFormatter.format(opportunityCount)} matches` : "Explore opportunities"}</span>
        <ArrowRight size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
