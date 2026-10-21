// src/pages/GuidePage.tsx
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
import { guideMeta, siteUrl } from "../seo/meta";
import { collectionPageJsonLd } from "../seo/structuredData";
import { GUIDES, type Guide } from "../seo/guides";
import { findCategoryByPath } from "../seo/categories";

export default function GuidePage({ guide }: { guide: Guide }) {
  const today = useToday();
  const matches = useMemo(
    () => sortOpportunities(OPPORTUNITIES.filter(guide.predicate), "deadline", today),
    [guide, today],
  );
  const { bookmarks, toggle } = useBookmarks();
  const meta = guideMeta(guide, matches.length);
  useSeoMeta(meta);

  const relatedCategory = findCategoryByPath(guide.relatedCategoryPath);
  const siblingGuides = GUIDES.filter((other) => other.path !== guide.path).slice(0, 4);

  return (
    <div className="seo-page">
      <SeoPageHeader />
      <JsonLd
        data={collectionPageJsonLd({
          name: guide.title,
          description: meta.description,
          canonical: meta.canonical,
          itemUrls: matches.map((opportunity) => siteUrl(`/opportunities/${opportunity.id}`)),
        })}
      />
      <main className="content seo-page-content">
        <Breadcrumbs
          items={[
            { name: "Home", path: "/" },
            { name: "Guides", path: "/guides" },
            { name: guide.title, path: guide.path },
          ]}
        />
        <h1>{guide.title}</h1>
        <div className="seo-guide-intro">
          {guide.intro.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
          <p>
            We found <strong>{matches.length}</strong> verified {matches.length === 1 ? "match" : "matches"}{" "}
            below. Want the full list instead? See all{" "}
            <Link to={guide.relatedCategoryPath} className="seo-related-link">
              {guide.relatedCategoryLabel}
            </Link>
            .
          </p>
        </div>
        <div className="opportunity-grid">
          {matches.map((opportunity, index) => (
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
          <h2>Keep exploring</h2>
          <ul>
            {relatedCategory && (
              <li>
                <Link to={relatedCategory.path}>{relatedCategory.title}</Link>
              </li>
            )}
            {siblingGuides.map((other) => (
              <li key={other.path}>
                <Link to={other.path}>{other.title}</Link>
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
