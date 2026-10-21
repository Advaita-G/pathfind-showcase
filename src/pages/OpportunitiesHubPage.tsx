// src/pages/OpportunitiesHubPage.tsx
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { OPPORTUNITIES } from "../data/opportunities";
import { useBookmarks } from "../lib/useBookmarks";
import { sortOpportunities } from "../lib/sortOpportunities";
import OpportunityCard from "../components/OpportunityCard";
import Breadcrumbs from "../components/Breadcrumbs";
import SeoPageHeader from "../components/SeoPageHeader";
import JsonLd from "../components/JsonLd";
import { useSeoMeta } from "../lib/useSeoMeta";
import { useToday } from "../lib/useToday";
import { hubMeta, siteUrl } from "../seo/meta";
import { collectionPageJsonLd } from "../seo/structuredData";
import { ALL_CATEGORIES } from "../seo/categories";
import { GUIDES } from "../seo/guides";

export default function OpportunitiesHubPage() {
  const today = useToday();
  const sorted = useMemo(() => sortOpportunities(OPPORTUNITIES, "deadline", today), [today]);
  const { bookmarks, toggle } = useBookmarks();
  const meta = hubMeta(sorted.length);
  useSeoMeta(meta);

  const typeCategories = ALL_CATEGORIES.filter((c) => c.kind === "type" || c.kind === "free");
  const groupCategories = ALL_CATEGORIES.filter((c) => c.kind === "group");
  const gradeCategories = ALL_CATEGORIES.filter((c) => c.kind === "grade");
  const interestCategories = ALL_CATEGORIES.filter((c) => c.kind === "interest");
  const locationCategories = ALL_CATEGORIES.filter((c) => c.kind === "location");

  return (
    <div className="seo-page">
      <SeoPageHeader />
      <JsonLd
        data={collectionPageJsonLd({
          name: meta.title,
          description: meta.description,
          canonical: meta.canonical,
          itemUrls: sorted.map((opportunity) => siteUrl(`/opportunities/${opportunity.id}`)),
        })}
      />
      <main className="content seo-page-content">
        <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Opportunities", path: "/opportunities" }]} />
        <h1>All verified opportunities</h1>
        <p className="seo-page-lede">
          Every research program, internship, competition, and summer program Pathfind has verified —{" "}
          {sorted.length} in total.
        </p>

        <nav className="seo-hub-categories" aria-label="Browse by category">
          <div>
            <h2>By type</h2>
            <ul>
              {typeCategories.map((c) => (
                <li key={c.path}>
                  <Link to={c.path}>{c.shortLabel}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2>By topic</h2>
            <ul>
              {groupCategories.map((c) => (
                <li key={c.path}>
                  <Link to={c.path}>{c.shortLabel}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2>By grade</h2>
            <ul>
              {gradeCategories.map((c) => (
                <li key={c.path}>
                  <Link to={c.path}>{c.shortLabel}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2>By interest</h2>
            <ul>
              {interestCategories.map((c) => (
                <li key={c.path}>
                  <Link to={c.path}>{c.shortLabel}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2>By location</h2>
            <ul>
              {locationCategories.map((c) => (
                <li key={c.path}>
                  <Link to={c.path}>{c.shortLabel}</Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <div className="opportunity-grid">
          {sorted.map((opportunity, index) => (
            <OpportunityCard
              key={opportunity.id}
              opportunity={opportunity}
              bookmarked={bookmarks.includes(opportunity.id)}
              onToggleBookmark={toggle}
              index={index}
              headingLevel="h2"
            />
          ))}
        </div>

        <nav className="seo-related" aria-label="Related pages">
          <h2>Not sure where to start?</h2>
          <ul>
            {GUIDES.map((guide) => (
              <li key={guide.path}>
                <Link to={guide.path}>{guide.title}</Link>
              </li>
            ))}
            <li>
              <Link to="/guides">All guides</Link>
            </li>
          </ul>
        </nav>
      </main>
    </div>
  );
}
