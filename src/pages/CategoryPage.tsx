// src/pages/CategoryPage.tsx
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
import { categoryMeta, siteUrl } from "../seo/meta";
import { collectionPageJsonLd } from "../seo/structuredData";
import { ALL_CATEGORIES, type Category } from "../seo/categories";
import { GUIDES } from "../seo/guides";

export default function CategoryPage({ category }: { category: Category }) {
  // Sorted against the build day on the first pass (so order matches the prerendered HTML),
  // then re-sorted from the real date once mounted.
  const today = useToday();
  const matches = useMemo(
    () => sortOpportunities(OPPORTUNITIES.filter(category.predicate), "deadline", today),
    [category, today],
  );
  const { bookmarks, toggle } = useBookmarks();
  const meta = categoryMeta(category, matches.length);
  useSeoMeta(meta);

  // Internal linking: a topic hub points down to its subject pages, subject pages point
  // back up to the hub, and any guide aimed at this category links across to it.
  const childCategories = (category.relatedPaths ?? [])
    .map((path) => ALL_CATEGORIES.find((c) => c.path === path))
    .filter((c): c is Category => Boolean(c));
  const parentGroups = ALL_CATEGORIES.filter(
    (c) => c.kind === "group" && c.path !== category.path && c.relatedPaths?.includes(category.path),
  );
  const relatedCategories = [...childCategories, ...parentGroups];
  const relatedGuides = GUIDES.filter((guide) => guide.relatedCategoryPath === category.path);

  return (
    <div className="seo-page">
      <SeoPageHeader />
      <JsonLd
        data={collectionPageJsonLd({
          name: category.title,
          description: meta.description,
          canonical: meta.canonical,
          itemUrls: matches.map((opportunity) => siteUrl(`/opportunities/${opportunity.id}`)),
        })}
      />
      <main className="content seo-page-content">
        <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: category.shortLabel, path: category.path }]} />
        <h1>{category.title}</h1>
        <p className="seo-page-lede">{category.buildDescription(matches.length)}</p>
        {category.intro && category.intro.length > 0 && (
          <div className="seo-category-intro">
            {category.intro.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        )}
        {matches.length === 0 ? (
          <p className="seo-empty-state">
            Nothing verified in this category yet. <Link to="/opportunities">Browse everything</Link>{" "}
            instead.
          </p>
        ) : (
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
        )}

        {(relatedCategories.length > 0 || relatedGuides.length > 0) && (
          <nav className="seo-related" aria-label="Related pages">
            <h2>Keep exploring</h2>
            <ul>
              {relatedCategories.map((related) => (
                <li key={related.path}>
                  <Link to={related.path}>{related.title}</Link>
                </li>
              ))}
              {relatedGuides.map((guide) => (
                <li key={guide.path}>
                  <Link to={guide.path}>{guide.title}</Link>
                </li>
              ))}
              <li>
                <Link to="/opportunities">All verified opportunities</Link>
              </li>
            </ul>
          </nav>
        )}
      </main>
    </div>
  );
}
