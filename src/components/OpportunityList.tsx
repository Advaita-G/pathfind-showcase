import { AnimatePresence } from "motion/react";
import type { ReactNode } from "react";
import { INTERESTS, type Interest, type Opportunity } from "../data/types";
import type { ApplyPathParams } from "./BuildMyPath";
import OpportunityCard from "./OpportunityCard";
import SpotlightSection from "./SpotlightSection";
import ClosingSoonRail from "./ClosingSoonRail";
import ExploreByInterest from "./ExploreByInterest";
import CuratedCollection from "./CuratedCollection";
import { isCurrentlyOpen } from "../lib/opportunityStatus";

export type ListMode = "landing" | "results" | "saved";

interface OpportunityListProps {
  opportunities: Opportunity[];
  mode: ListMode;
  bookmarks: string[];
  onToggleBookmark: (id: string) => void;
  onClearFilters: () => void;
  closingSoonOpportunities?: Opportunity[];
  onSelectInterest?: (interest: Interest) => void;
  pathMatchContext?: ApplyPathParams | null;
  onOpenMyPath?: () => void;
  pathBuilder?: ReactNode;
  savedIdeasSection?: ReactNode;
  savedIdeasCount?: number;
  onBrowse?: () => void;
  onOpenDetail?: (opportunity: Opportunity) => void;
}

export default function OpportunityList({
  opportunities,
  mode,
  bookmarks,
  onToggleBookmark,
  onClearFilters,
  closingSoonOpportunities = [],
  onSelectInterest,
  pathMatchContext,
  onOpenMyPath,
  pathBuilder,
  savedIdeasSection,
  savedIdeasCount = 0,
  onBrowse,
  onOpenDetail,
}: OpportunityListProps) {
  if (mode === "saved") {
    return (
      <div className="saved-workspace">
        <header className="saved-page-head">
          <h1 tabIndex={-1}>Saved</h1>
          <p>
            {opportunities.length} {opportunities.length === 1 ? "opportunity" : "opportunities"} · {savedIdeasCount}{" "}
            project {savedIdeasCount === 1 ? "idea" : "ideas"}
          </p>
        </header>
        <section className="saved-section" aria-labelledby="saved-opps-heading">
          <div className="saved-section-head">
            <h2 id="saved-opps-heading" tabIndex={-1}>Opportunities</h2>
            <span className="saved-section-count">{opportunities.length}</span>
          </div>
          {opportunities.length === 0 ? (
            <div className="saved-empty">
              <p className="saved-empty-title">No opportunities saved yet</p>
              <p>Tap the bookmark on any program card to keep it here for later.</p>
              <button type="button" className="saved-empty-action" onClick={onBrowse}>
                Browse opportunities
              </button>
            </div>
          ) : (
            <div className="opportunity-grid">
              <AnimatePresence mode="popLayout">
                {opportunities.map((opportunity, index) => (
                  <OpportunityCard
                    key={opportunity.id}
                    opportunity={opportunity}
                    bookmarked={bookmarks.includes(opportunity.id)}
                    onToggleBookmark={onToggleBookmark}
                    index={index}
                    onSelectInterest={onSelectInterest}
                    onOpenDetail={onOpenDetail}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>
        {savedIdeasSection}
      </div>
    );
  }

  if (opportunities.length === 0) {
    return (
      <div className="empty-state" tabIndex={-1}>
        <p className="empty-state-heading">No matches for that combination</p>
        <p>Try a different grade, add another interest, or search a different keyword.</p>
        <button type="button" className="empty-state-clear" onClick={onClearFilters}>
          Clear filters
        </button>
      </div>
    );
  }

  if (mode === "landing") {
    const freeOpportunities = opportunities.filter((o) => o.free).slice(0, 4);
    const researchOpportunities = opportunities.filter((o) => o.type === "Research").slice(0, 4);
    // Cards already shown in a collection above are not repeated below, and closed cycles go last
    // so the first things a student sees in "More" are ones they can still apply to.
    const shownAbove = new Set([
      ...(researchOpportunities.length >= 3 ? researchOpportunities : []),
      ...(freeOpportunities.length >= 3 ? freeOpportunities : []),
    ].map((o) => o.id));
    const moreOpportunities = opportunities.slice(3).filter((o) => !shownAbove.has(o.id));
    // Bay Area programs are limited to local students, so nationwide and remote ones lead.
    const isLocal = (o: Opportunity) => o.location === "Bay Area";
    const moreSorted = [
      ...moreOpportunities.filter((o) => isCurrentlyOpen(o) && !isLocal(o)),
      ...moreOpportunities.filter((o) => isCurrentlyOpen(o) && isLocal(o)),
      ...moreOpportunities.filter((o) => !isCurrentlyOpen(o)),
    ];

    return (
      <div className="landing-experience">
        <SpotlightSection
          opportunities={opportunities}
          bookmarks={bookmarks}
          onToggleBookmark={onToggleBookmark}
          onOpenDetail={onOpenDetail}
        />

        {pathBuilder}

        {closingSoonOpportunities.length > 0 && (
          <ClosingSoonRail
            opportunities={closingSoonOpportunities}
            bookmarks={bookmarks}
            onToggleBookmark={onToggleBookmark}
            onOpenDetail={onOpenDetail}
          />
        )}

        {onSelectInterest && <ExploreByInterest onSelectInterest={onSelectInterest} />}

        {researchOpportunities.length >= 3 && (
          <CuratedCollection
            title="Start with research"
            subtitle="Four verified ways to work on real questions with researchers"
            opportunities={researchOpportunities}
            bookmarks={bookmarks}
            onToggleBookmark={onToggleBookmark}
            tone="raised"
            onOpenDetail={onOpenDetail}
          />
        )}

        {freeOpportunities.length >= 3 && (
          <CuratedCollection
            title="No tuition required"
            subtitle="Programs currently listed without tuition costs"
            opportunities={freeOpportunities}
            bookmarks={bookmarks}
            onToggleBookmark={onToggleBookmark}
            tone="moss"
            onOpenDetail={onOpenDetail}
          />
        )}

        <section id="more-opportunities" className="more-opportunities-section">
          <div className="more-opportunities-header">
            <h2 className="more-opportunities-title">More Opportunities</h2>
            <p className="more-opportunities-subtitle">
              Keep browsing, or use search and filters above when you know what you want
            </p>
          </div>

          <div className="opportunity-grid">
            <AnimatePresence mode="popLayout">
              {moreSorted.map((opportunity, index) => (
                <OpportunityCard
                  key={opportunity.id}
                  opportunity={opportunity}
                  bookmarked={bookmarks.includes(opportunity.id)}
                  onToggleBookmark={onToggleBookmark}
                  index={index + 3}
                  onSelectInterest={onSelectInterest}
                  onOpenDetail={onOpenDetail}
                />
              ))}
            </AnimatePresence>
          </div>
        </section>
      </div>
    );
  }

  const heading = `${opportunities.length} ${opportunities.length === 1 ? "opportunity" : "opportunities"} found`;

  const pathInterestLabels = pathMatchContext?.interests
    .map((interest) => INTERESTS.find((item) => item.id === interest)?.label)
    .filter((label): label is string => Boolean(label)) ?? [];

  return (
    <div>
      {mode === "results" && pathMatchContext && (
        <aside className="path-match-context" aria-label="Results matched from My Path">
          <div>
            <span>Matched from My Path</span>
            <h2 tabIndex={-1}>{heading}</h2>
            <p>
              {pathInterestLabels.length > 0 ? pathInterestLabels.join(" · ") : "All interests"}
              {pathMatchContext.types.length > 0 ? ` · ${pathMatchContext.types.join(" · ")}` : ""}
            </p>
          </div>
          <div className="path-match-context-actions">
            {onOpenMyPath && <button type="button" onClick={onOpenMyPath}>Open My Path</button>}
            <button type="button" onClick={onClearFilters}>Clear path filters</button>
          </div>
        </aside>
      )}
      <div className={`results-header${pathMatchContext && mode === "results" ? " is-contextual" : ""}`}>
        <h2 className="results-count" tabIndex={-1}>{heading}</h2>
      </div>

      <div className="opportunity-grid">
        <AnimatePresence mode="popLayout">
          {opportunities.map((opportunity, index) => (
            <OpportunityCard
              key={opportunity.id}
              opportunity={opportunity}
              bookmarked={bookmarks.includes(opportunity.id)}
              onToggleBookmark={onToggleBookmark}
              index={index}
              onSelectInterest={onSelectInterest}
              onOpenDetail={onOpenDetail}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
