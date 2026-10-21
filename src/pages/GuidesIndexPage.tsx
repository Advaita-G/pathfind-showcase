// src/pages/GuidesIndexPage.tsx
import { Link } from "react-router-dom";
import { OPPORTUNITIES } from "../data/opportunities";
import Breadcrumbs from "../components/Breadcrumbs";
import SeoPageHeader from "../components/SeoPageHeader";
import JsonLd from "../components/JsonLd";
import { useSeoMeta } from "../lib/useSeoMeta";
import { guidesIndexMeta, siteUrl } from "../seo/meta";
import { collectionPageJsonLd } from "../seo/structuredData";
import { GUIDES } from "../seo/guides";

export default function GuidesIndexPage() {
  const meta = guidesIndexMeta();
  useSeoMeta(meta);

  return (
    <div className="seo-page">
      <SeoPageHeader />
      <JsonLd
        data={collectionPageJsonLd({
          name: meta.title,
          description: meta.description,
          canonical: meta.canonical,
          itemUrls: GUIDES.map((guide) => siteUrl(guide.path)),
        })}
      />
      <main className="content seo-page-content">
        <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Guides", path: "/guides" }]} />
        <h1>Guides for finding opportunities</h1>
        <p className="seo-page-lede">
          Practical starting points for specific searches, backed by Pathfind's verified opportunity
          database.
        </p>
        <ul className="seo-guides-list">
          {GUIDES.map((guide) => {
            const count = OPPORTUNITIES.filter(guide.predicate).length;
            return (
              <li key={guide.path}>
                <Link to={guide.path} className="seo-guides-list-link">
                  <span>{guide.title}</span>
                  <span className="seo-guides-list-count">{count} verified</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
