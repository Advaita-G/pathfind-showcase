import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { INTERESTS, type Interest, type Opportunity } from "../data/types";
import { daysUntil, formatDeadline } from "../lib/formatDeadline";
import { useToday } from "../lib/useToday";
import { IconBookmark, IconPin } from "./icons";

const INTEREST_LABELS = Object.fromEntries(INTERESTS.map((i) => [i.id, i.label])) as Record<
  Interest,
  string
>;

export interface OpportunityCardProps {
  opportunity: Opportunity;
  bookmarked: boolean;
  onToggleBookmark: (id: string) => void;
  index?: number;
  variant?: "default" | "spotlight" | "compact" | "curated";
  onSelectInterest?: (interest: Interest) => void;
  /** Opens Pathfind's in-app detail experience. When absent, the card title links
   *  straight to the official site (used by contexts without a detail handler). */
  onOpenDetail?: (opportunity: Opportunity) => void;
  /**
   * Heading level for the card title. Cards sit under an H1 on the public category,
   * guide and hub pages, so those pass "h2" to keep the outline H1 → H2; the homepage
   * and in-app grids sit under H2s, where the default "h3" stays correct.
   */
  headingLevel?: "h2" | "h3";
}

export function DeadlineMeta({
  opportunity,
  showUrgentTag = true,
}: {
  opportunity: Opportunity;
  showUrgentTag?: boolean;
}) {
  // "42d left" is relative to today; on a prerendered page that comes from the build-day
  // stamp first so hydration matches, then from the real date. See lib/useToday.ts.
  const today = useToday();

  if (!opportunity.deadline) {
    return (
      <div className="card-deadline-block">
        <span className="card-deadline-status card-deadline-status--rolling">Rolling Admission</span>
        <span className="card-deadline-date">Open Year-Round</span>
      </div>
    );
  }

  const days = daysUntil(opportunity.deadline, today);
  const isPassed = days < 0;
  const isUrgent = days >= 0 && days <= 30;

  let urgencyLabel = `${days}d left`;
  if (isPassed) urgencyLabel = "Passed";
  else if (days === 0) urgencyLabel = "Due Today";
  else if (days === 1) urgencyLabel = "Due Tomorrow";

  return (
    <div className="card-deadline-block">
      <div className="card-deadline-row">
        <span className="card-deadline-label">Deadline</span>
        {opportunity.deadlineConfirmed === false && (
          <span
            className="card-deadline-estimate"
            title="Estimated based on prior year's cycle. Verify on official site."
          >
            (est.)
          </span>
        )}
        {showUrgentTag && (
          <span
            className={`card-deadline-badge${isUrgent ? " is-urgent" : ""}${isPassed ? " is-passed" : ""}`}
          >
            {urgencyLabel}
          </span>
        )}
      </div>
      <span className="card-deadline-date">{formatDeadline(opportunity.deadline)}</span>
    </div>
  );
}

export default function OpportunityCard({
  opportunity,
  bookmarked,
  onToggleBookmark,
  index = 0,
  variant = "default",
  onSelectInterest,
  onOpenDetail,
  headingLevel = "h3",
}: OpportunityCardProps) {
  const isSpotlight = variant === "spotlight";
  const isCompact = variant === "compact";
  const TitleHeading = headingLevel;

  const gradeRange =
    opportunity.minGrade === opportunity.maxGrade
      ? `Grade ${opportunity.minGrade}`
      : `Grades ${opportunity.minGrade}–${opportunity.maxGrade}`;

  return (
    <motion.article
      initial={{ y: 16, opacity: 0.9 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}
      whileHover={{ y: -4, transition: { type: "spring", stiffness: 450, damping: 26 } }}
      layout="position"
      transition={{
        type: "spring",
        stiffness: 380,
        damping: 28,
        delay: Math.min(index * 0.025, 0.2),
      }}
      className={`op-card op-card--${variant}`}
    >
      <div className="op-card-header">
        <div className="op-card-eyebrow">
          <span className={`op-card-type op-card-type--${opportunity.type.toLowerCase()}`}>
            {opportunity.type}
          </span>
          <span className="op-card-dot" aria-hidden="true">
            ·
          </span>
          <span className="op-card-org" title={opportunity.org}>
            {opportunity.org}
          </span>
        </div>

        <button
          type="button"
          className={`op-card-bookmark${bookmarked ? " is-saved" : ""}`}
          aria-pressed={bookmarked}
          aria-label={bookmarked ? `Remove ${opportunity.title} from saved` : `Save ${opportunity.title}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleBookmark(opportunity.id);
          }}
        >
          <IconBookmark filled={bookmarked} />
        </button>
      </div>

      <div className="op-card-body">
        <TitleHeading className="op-card-title">
          {/* Title links to Pathfind's own crawlable opportunity page — the explainer a
              student lands on, which itself links out to the official site. */}
          <Link to={`/opportunities/${opportunity.id}`} className="op-card-title-link">
            {opportunity.title}
          </Link>
        </TitleHeading>

        <p className={`op-card-desc${isSpotlight ? " is-spotlight" : isCompact ? " is-compact" : " is-clamped"}`}>
          {opportunity.description}
        </p>

        <div className="op-card-meta-row">
          <span className={`op-meta-pill op-meta-pill--cost ${opportunity.free ? "is-free" : "is-paid"}`}>
            {opportunity.free ? "Tuition-Free" : "Tuition-Based"}
          </span>
          <span className="op-meta-pill op-meta-pill--location">
            <IconPin className="op-meta-icon" aria-hidden="true" />
            {opportunity.location}
          </span>
          <span className="op-meta-pill op-meta-pill--grade">{gradeRange}</span>
        </div>

        {opportunity.interests.length > 0 && !isCompact && (
          <div className="op-card-interests">
            {opportunity.interests.slice(0, isSpotlight ? 4 : 3).map((interest) => (
              <button
                key={interest}
                type="button"
                className="op-interest-tag"
                onClick={(e) => {
                  if (onSelectInterest) {
                    e.preventDefault();
                    onSelectInterest(interest);
                  }
                }}
              >
                #{INTEREST_LABELS[interest] || interest}
              </button>
            ))}
            {opportunity.interests.length > (isSpotlight ? 4 : 3) && (
              <span className="op-interest-more">
                +{opportunity.interests.length - (isSpotlight ? 4 : 3)} more
              </span>
            )}
          </div>
        )}
      </div>

      <div className="op-card-footer">
        <DeadlineMeta opportunity={opportunity} />
        {onOpenDetail ? (
          <button
            type="button"
            className="op-card-action"
            onClick={() => onOpenDetail(opportunity)}
            aria-label={`Quick look at ${opportunity.title}`}
          >
            <span>Quick look</span>
            <span className="op-card-action-arrow" aria-hidden="true">
              →
            </span>
          </button>
        ) : (
          <a
            className="op-card-action"
            href={opportunity.link}
            target="_blank"
            rel="noreferrer"
            aria-label={`Apply or view details for ${opportunity.title}`}
          >
            <span>Explore</span>
            <span className="op-card-action-arrow" aria-hidden="true">
              ↗
            </span>
          </a>
        )}
      </div>
    </motion.article>
  );
}
