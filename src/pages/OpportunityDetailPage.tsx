// src/pages/OpportunityDetailPage.tsx
import { Link, useParams } from "react-router-dom";
import { OPPORTUNITIES } from "../data/opportunities";
import { useBookmarks } from "../lib/useBookmarks";
import { usePlans } from "../context/PlansContext";
import { useAssistant } from "../context/AssistantContext";
import { DeadlineMeta } from "../components/OpportunityCard";
import TrustBadge from "../components/TrustBadge";
import FitList from "../components/FitList";
import { INTERESTS } from "../data/types";
import { slugify } from "../lib/slugify";
import Breadcrumbs from "../components/Breadcrumbs";
import SeoPageHeader from "../components/SeoPageHeader";
import JsonLd from "../components/JsonLd";
import NotFoundPage from "./NotFoundPage";
import { useSeoMeta } from "../lib/useSeoMeta";
import { notFoundMeta, opportunityMeta, siteUrl } from "../seo/meta";
import { webPageJsonLd } from "../seo/structuredData";
import { ALL_CATEGORIES } from "../seo/categories";
import { GUIDES } from "../seo/guides";
import { encodeFilters } from "../lib/urlState";
import { buildFitSentence, costLabel, formatGradeRange } from "../lib/opportunityCopy";
import { getOpportunityExplainer } from "../data/opportunityExplainers";
import { downloadDeadlineCalendar } from "../lib/calendarExport";
import { daysUntil } from "../lib/formatDeadline";

const INTEREST_LABELS = Object.fromEntries(INTERESTS.map((i) => [i.id, i.label]));

export default function OpportunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const opportunity = OPPORTUNITIES.find((o) => o.id === id);
  const { bookmarks, toggle } = useBookmarks();
  const { plans } = usePlans();
  const { ask } = useAssistant();
  useSeoMeta(opportunity ? opportunityMeta(opportunity) : notFoundMeta());

  if (!opportunity) return <NotFoundPage />;

  const hasPlan = Boolean(plans[opportunity.id]);
  const pageMeta = opportunityMeta(opportunity);
  const explainer = getOpportunityExplainer(opportunity.id);
  const fitCopy = explainer?.fit ?? buildFitSentence(opportunity);
  const relatedOpportunities = OPPORTUNITIES.filter((candidate) => {
    if (candidate.id === opportunity.id || candidate.type !== opportunity.type) return false;
    return candidate.interests.some((interest) => opportunity.interests.includes(interest));
  }).slice(0, 3);

  const primaryCategory = ALL_CATEGORIES.find(
    (category) => category.kind === "type" && category.predicate(opportunity),
  );
  // Internal linking: when a curated guide curates this opportunity, point students at
  // it — a guide gives the surrounding context a single listing can't. One guide per
  // page keeps the link natural rather than a link farm.
  const featuringGuide = GUIDES.find((guide) => guide.predicate(opportunity));
  const gradeRange = formatGradeRange(opportunity);
  const exploreQuery = encodeFilters({
    grade: null,
    interests: [],
    types: [opportunity.type],
    locations: [],
    freeOnly: false,
    query: "",
    sortBy: "deadline",
  });

  return (
    <div className="seo-page">
      <SeoPageHeader />
      <JsonLd
        data={webPageJsonLd({
          name: opportunity.title,
          description: pageMeta.description,
          canonical: siteUrl(`/opportunities/${opportunity.id}`),
        })}
      />
      <main className="content seo-page-content seo-detail-page">
        <Breadcrumbs
          items={[
            { name: "Home", path: "/" },
            ...(primaryCategory ? [{ name: primaryCategory.shortLabel, path: primaryCategory.path }] : []),
            { name: opportunity.title, path: `/opportunities/${opportunity.id}` },
          ]}
        />
        <div className="seo-detail-hero">
          <div className="seo-detail-hero-copy">
            <div className="seo-eyebrow">
              <span>{opportunity.type} <span aria-hidden="true">·</span> {opportunity.org}</span>
              {" "}
              <TrustBadge opportunity={opportunity} />
            </div>
            <h1>{opportunity.title}</h1>
            <p className="seo-page-lede">{opportunity.description}</p>
            {opportunity.interests.length > 0 && (
              <div className="seo-detail-interests" aria-label="Subjects">
                {opportunity.interests.map((interest) => (
                  <Link key={interest} to={`/interests/${slugify(INTEREST_LABELS[interest])}`}>
                    #{INTEREST_LABELS[interest]}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <aside className="seo-detail-hero-note" aria-label="Pathfind note">
            <span className="seo-detail-hero-note-mark" aria-hidden="true">↗</span>
            <p>Understand the opportunity first. The official site has the final application details.</p>
          </aside>
        </div>

        <div className="seo-detail-actions">
          <button
            type="button"
            className={`seo-bookmark-button${bookmarks.includes(opportunity.id) ? " is-saved" : ""}`}
            onClick={() => toggle(opportunity.id)}
          >
            {bookmarks.includes(opportunity.id) ? "Saved" : "Save opportunity"}
          </button>
          {!opportunity.inactive && (
            <Link to={`/plans?o=${encodeURIComponent(opportunity.id)}`} className="seo-apply-link">
              {hasPlan ? "Open your plan" : "Plan this opportunity"}
            </Link>
          )}
          <a href={opportunity.link} target="_blank" rel="noreferrer" className="seo-explore-link">
            Visit official site ↗
          </a>
          <button
            type="button"
            className="seo-explore-link"
            onClick={() => ask(`Tell me about ${opportunity.title} and whether it's a good fit for me.`, [opportunity.id])}
          >
            Ask Pathfind
          </button>
          <Link to={`/?${exploreQuery}`} className="seo-explore-link">
            See more {opportunity.type.toLowerCase()} opportunities
          </Link>
        </div>

        <div className="seo-detail-layout">
          <article className="seo-detail-story">
            <p className="seo-section-kicker">A clearer starting point</p>
            <h2>What this opportunity is really like</h2>
            <p className="seo-detail-story-lede">
              Here’s the short version before you leave Pathfind to investigate the official details.
            </p>

            {explainer?.whatYouDo && (
              <section className="seo-detail-story-section">
                <h3>What you would do</h3>
                <p>{explainer.whatYouDo}</p>
              </section>
            )}
            {explainer?.whyWorthIt && (
              <section className="seo-detail-story-section">
                <h3>Why it might be worth your time</h3>
                <p>{explainer.whyWorthIt}</p>
              </section>
            )}
            <section className="seo-detail-story-section">
              <h3>Is it a good fit?</h3>
              <p>{fitCopy}</p>
              <FitList opportunity={opportunity} />
            </section>
          </article>

          <aside className="seo-detail-sidebar">
            <section className="seo-detail-facts-card" aria-labelledby="verified-facts-heading">
              <p className="seo-section-kicker">Pathfind verified</p>
              <h2 id="verified-facts-heading">Key facts</h2>
              <div className="seo-detail-facts">
                <div>
                  <span className="seo-detail-fact-label">Grades</span>
                  <span>{gradeRange}</span>
                </div>
                <div>
                  <span className="seo-detail-fact-label">Location</span>
                  <span>{opportunity.location}</span>
                </div>
                <div>
                  <span className="seo-detail-fact-label">Cost</span>
                  <span>{costLabel(opportunity)}</span>
                </div>
                <DeadlineMeta opportunity={opportunity} />
                {opportunity.deadline && daysUntil(opportunity.deadline) >= 0 && (
                  <div>
                    <span className="seo-detail-fact-label">Calendar</span>
                    <button type="button" className="assistant-text-button" onClick={() => downloadDeadlineCalendar(opportunity)}>
                      Add deadline to calendar
                    </button>
                  </div>
                )}
                <div>
                  <span className="seo-detail-fact-label">Organizer</span>
                  <span>{opportunity.org}</span>
                </div>
              </div>
              <p className="seo-detail-grade-link">
                {/* Internal linking: every opportunity page points at its grade hub, and
                    the grade hub links back down to this page. */}
                Open to more than your grade? See{" "}
                <Link to={`/grades/${opportunity.maxGrade}`}>
                  everything for grade {opportunity.maxGrade}
                </Link>
                .
              </p>
              <p className="seo-detail-disclaimer">
                Details can change. The official site is always the final word.
              </p>
            </section>

            <section className="seo-detail-next" aria-labelledby="next-step-heading">
              <p className="seo-section-kicker">Your next step</p>
              <h2 id="next-step-heading">Check the details, then decide.</h2>
              <p>Use the official site for current dates, requirements, and the application process.</p>
              <a href={opportunity.link} target="_blank" rel="noreferrer" className="seo-detail-next-link">
                Visit {opportunity.org} ↗
              </a>
            </section>
          </aside>
        </div>

        {featuringGuide && (
          <p className="seo-detail-grade-link">
            Planning a summer around this? See the{" "}
            <Link to={featuringGuide.path}>{featuringGuide.title.toLowerCase()}</Link> it appears
            in, alongside the other verified options.
          </p>
        )}

        {relatedOpportunities.length > 0 && (
          <section className="seo-detail-related" aria-labelledby="related-heading">
            <div>
              <p className="seo-section-kicker">Keep exploring</p>
              <h2 id="related-heading">More {opportunity.type.toLowerCase()} opportunities</h2>
            </div>
            <div className="seo-detail-related-grid">
              {relatedOpportunities.map((related) => (
                <Link key={related.id} to={`/opportunities/${related.id}`} className="seo-detail-related-card">
                  <span>{related.org}</span>
                  <strong>{related.title}</strong>
                  <small>{related.location} · Grades {related.minGrade}–{related.maxGrade}</small>
                  <em>Read the overview →</em>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
