import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, Bookmark, MessageCircleQuestion, X } from "lucide-react";
import { INTERESTS, type Opportunity } from "../data/types";
import { getOpportunityExplainer } from "../data/opportunityExplainers";
import { daysUntil, formatDeadline } from "../lib/formatDeadline";
import { downloadDeadlineCalendar } from "../lib/calendarExport";
import { buildFitSentence, costLabel, formatGradeRange } from "../lib/opportunityCopy";
import { useEscapeToClose } from "../lib/useEscapeToClose";
import { useAssistant } from "../context/AssistantContext";
import { usePlans } from "../context/PlansContext";
import { IconPin } from "./icons";
import TrustBadge from "./TrustBadge";
import FitList from "./FitList";
import "../planner.css";

interface OpportunityDetailProps {
  opportunity: Opportunity | null;
  onClose: () => void;
  bookmarked: boolean;
  onToggleBookmark: (id: string) => void;
  onSelectInterest?: (interest: Opportunity["interests"][number]) => void;
  /** Full eligibility/cost/link and the editorial explainer are gated behind sign-in;
   *  saving is not (see usePathProfile — bookmarks already work for guests via localStorage). */
  signedIn: boolean;
  onRequestSignIn: () => void;
}

const INTEREST_LABELS = Object.fromEntries(INTERESTS.map((i) => [i.id, i.label])) as Record<
  Opportunity["interests"][number],
  string
>;

/**
 * In-app explainer shown when a student clicks an opportunity: what it is, who it's for,
 * and the verified facts (dates, cost, location, eligibility) from Pathfind's dataset.
 * Only verified dataset fields are shown — anything unknown is omitted, never guessed.
 * The official site remains the authoritative destination for registration and final details.
 */
export default function OpportunityDetail({
  opportunity,
  onClose,
  bookmarked,
  onToggleBookmark,
  onSelectInterest,
  signedIn,
  onRequestSignIn,
}: OpportunityDetailProps) {
  const prefersReducedMotion = useReducedMotion();
  const { ask } = useAssistant();
  useEscapeToClose(!!opportunity, onClose);
  const isOpen = opportunity !== null;

  // Lock body scroll while the drawer is open (same approach as the more-filters panel).
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const { plans } = usePlans();
  const hasPlan = opportunity ? Boolean(plans[opportunity.id]) : false;
  const gradeRange = useMemo(
    () => (opportunity ? formatGradeRange(opportunity) : ""),
    [opportunity],
  );

  // Hand-written explainer when one exists; the drawer falls back to copy built only
  // from the record's verified fields (see lib/opportunityCopy.ts).
  const explainer = useMemo(() => getOpportunityExplainer(opportunity?.id), [opportunity?.id]);

  const deadlineCopy = useMemo(() => {
    if (!opportunity) return null;
    if (!opportunity.deadline) {
      return { label: "Deadline", value: "Rolling admission — open year-round", note: null as string | null };
    }
    const days = daysUntil(opportunity.deadline);
    if (days < 0) return { label: "Deadline", value: formatDeadline(opportunity.deadline), note: "This cycle's deadline has passed — check the official site for the next one." };
    const estimate = opportunity.deadlineConfirmed === false
      ? "Estimated from the prior year's cycle — confirm the current date on the official site."
      : null;
    return { label: "Deadline", value: formatDeadline(opportunity.deadline), note: estimate };
  }, [opportunity]);

  const calendarButton = opportunity?.deadline && daysUntil(opportunity.deadline) >= 0 ? (
    <button type="button" className="assistant-text-button" onClick={() => downloadDeadlineCalendar(opportunity)}>
      Add deadline to calendar
    </button>
  ) : null;

  return (
    <AnimatePresence>
      {opportunity && (
        <motion.div
          className="opportunity-detail-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="opportunity-detail"
            initial={prefersReducedMotion ? { opacity: 0 } : { x: "100%" }}
            animate={prefersReducedMotion ? { opacity: 1 } : { x: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { x: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`${opportunity.title} details`}
          >
            <div className="opportunity-detail-header">
              <div className="opportunity-detail-eyebrow">
                <span className={`op-card-type op-card-type--${opportunity.type.toLowerCase()}`}>
                  {opportunity.type}
                </span>
                <TrustBadge opportunity={opportunity} />
              </div>
              <button type="button" onClick={onClose} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="opportunity-detail-body">
              <header className="opportunity-detail-intro">
                <p className="opportunity-detail-org">{opportunity.org}</p>
                <h2 id="opportunity-detail-title">{opportunity.title}</h2>
                <p className="opportunity-description">{opportunity.description}</p>
              </header>

              {signedIn ? (
                <>
                  {explainer?.whatYouDo && (
                    <section
                      className="opportunity-detail-section"
                      aria-labelledby="opportunity-detail-what-you-do"
                    >
                      <h3 id="opportunity-detail-what-you-do">What you do</h3>
                      <p>{explainer.whatYouDo}</p>
                    </section>
                  )}

                  {explainer?.whyWorthIt && (
                    <section
                      className="opportunity-detail-section"
                      aria-labelledby="opportunity-detail-why"
                    >
                      <h3 id="opportunity-detail-why">Why it's worth it</h3>
                      <p>{explainer.whyWorthIt}</p>
                    </section>
                  )}

                  <section className="opportunity-detail-section" aria-labelledby="opportunity-detail-fit">
                    <h3 id="opportunity-detail-fit">Is this for you?</h3>
                    <p>{explainer?.fit ?? buildFitSentence(opportunity)}</p>
                    <FitList opportunity={opportunity} />
                    {opportunity.interests.length > 0 && (
                      <div className="opportunity-detail-interests">
                        {opportunity.interests.map((interest) =>
                          onSelectInterest ? (
                            <button
                              key={interest}
                              type="button"
                              className="op-interest-tag"
                              onClick={() => onSelectInterest(interest)}
                            >
                              #{INTEREST_LABELS[interest] ?? interest}
                            </button>
                          ) : (
                            <span key={interest} className="op-interest-tag">
                              #{INTEREST_LABELS[interest] ?? interest}
                            </span>
                          ),
                        )}
                      </div>
                    )}
                  </section>

                  {!opportunity.inactive && (
                    <section className="opportunity-detail-section" aria-label="Plan this opportunity">
                      <Link to={`/plans?o=${encodeURIComponent(opportunity.id)}`} className="detail-plan-cta" onClick={onClose}>
                        {hasPlan ? "Open your plan" : "Plan this opportunity"}
                      </Link>
                    </section>
                  )}

                  <section className="opportunity-detail-section" aria-label="Verified facts">
                    <h3>The facts</h3>
                    <dl className="opportunity-detail-facts">
                      <div>
                        <dt>Organizer</dt>
                        <dd>{opportunity.org}</dd>
                      </div>
                      <div>
                        <dt>Eligibility</dt>
                        <dd>{gradeRange}</dd>
                      </div>
                      <div>
                        <dt>Format</dt>
                        <dd>
                          <IconPin className="op-meta-icon" aria-hidden="true" />
                          {opportunity.location}
                        </dd>
                      </div>
                      <div>
                        <dt>Cost</dt>
                        <dd>{costLabel(opportunity)}</dd>
                      </div>
                      {deadlineCopy && (
                        <div>
                          <dt>{deadlineCopy.label}</dt>
                          <dd>
                            {deadlineCopy.value}
                            {deadlineCopy.note && (
                              <span className="opportunity-detail-note">{deadlineCopy.note}</span>
                            )}
                            {calendarButton && <span className="opportunity-detail-note">{calendarButton}</span>}
                          </dd>
                        </div>
                      )}
                    </dl>
                    <p className="opportunity-detail-disclaimer">
                      Details come from Pathfind's dataset. The badge above shows when each record was
                      last checked — the official site is always the final word.
                    </p>
                  </section>
                </>
              ) : (
                <>
                {calendarButton && deadlineCopy && (
                  <section className="opportunity-detail-section" aria-label="Deadline">
                    <h3>{deadlineCopy.label}</h3>
                    <p>{deadlineCopy.value}</p>
                    {deadlineCopy.note && <p className="opportunity-detail-note">{deadlineCopy.note}</p>}
                    {calendarButton}
                  </section>
                )}
                <section className="opportunity-detail-gate" aria-label="Sign in to see full details">
                  <h3>Sign in to see the rest</h3>
                  <p>
                    Eligibility, cost, and the official application link are one free
                    sign-in away.
                  </p>
                  <button type="button" className="opportunity-detail-gate-cta" onClick={onRequestSignIn}>
                    Sign in with Google
                  </button>
                </section>
                </>
              )}
            </div>

            <div className="opportunity-detail-footer">
              <button
                type="button"
                className="opportunity-detail-ask"
                aria-label={`Ask the Pathfind assistant about ${opportunity.title}`}
                onClick={() =>
                  ask(`Tell me about ${opportunity.title} and whether it's a good fit for me.`, [opportunity.id])
                }
              >
                <MessageCircleQuestion size={17} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={`opportunity-detail-save${bookmarked ? " is-saved" : ""}`}
                aria-pressed={bookmarked}
                onClick={() => onToggleBookmark(opportunity.id)}
              >
                <Bookmark size={17} fill={bookmarked ? "currentColor" : "none"} aria-hidden="true" />
                {bookmarked ? "Saved" : "Save"}
              </button>
              {signedIn ? (
                <a
                  className="opportunity-detail-visit"
                  href={opportunity.link}
                  target="_blank"
                  rel="noreferrer"
                >
                  Visit Official Website <ArrowUpRight size={17} aria-hidden="true" />
                </a>
              ) : (
                <button type="button" className="opportunity-detail-visit" onClick={onRequestSignIn}>
                  Sign in to visit site <ArrowUpRight size={17} aria-hidden="true" />
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
