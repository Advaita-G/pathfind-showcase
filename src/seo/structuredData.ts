// src/seo/structuredData.ts
//
// Schema.org builders for Pathfind's public pages. Deliberately conservative: we only
// emit types the page genuinely represents and only facts we actually hold (name, URL,
// description, a list of things on the page). No reviews, ratings, awards, founders,
// addresses, prices, or statistics are invented here.

import { siteUrl } from "./meta";

export const SITE_NAME = "Pathfind";
export const SITE_URL = siteUrl("/");

function organizationNode() {
  return {
    "@type": "Organization",
    "@id": `${SITE_URL}#organization`,
    name: SITE_NAME,
    url: SITE_URL,
  };
}

/** WebSite + Organization. Emitted once, on the homepage. */
export function websiteJsonLd(description: string): object {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}#website`,
        name: SITE_NAME,
        alternateName: ["GetPathfind", "getpathfind.com"],
        url: SITE_URL,
        description,
        inLanguage: "en-US",
        publisher: { "@id": `${SITE_URL}#organization` },
      },
      organizationNode(),
    ],
  };
}

export interface PageSchemaInput {
  name: string;
  description: string;
  canonical: string;
}

/** A single public page that isn't a list of opportunities. */
export function webPageJsonLd({ name, description, canonical }: PageSchemaInput): object {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name,
    description,
    url: canonical,
    inLanguage: "en-US",
    isPartOf: { "@id": `${SITE_URL}#website` },
    publisher: { "@id": `${SITE_URL}#organization` },
  };
}

export interface CollectionSchemaInput extends PageSchemaInput {
  /** Canonical URLs of the opportunities listed on the page. */
  itemUrls: string[];
}

/**
 * A page whose main job is listing opportunities. Capped at 40 entries so the markup
 * stays a reasonable size on the big hub pages.
 */
export function collectionPageJsonLd({ name, description, canonical, itemUrls }: CollectionSchemaInput): object {
  const items = itemUrls.slice(0, 40);
  const mainEntity =
    items.length === 0
      ? undefined
      : {
          "@type": "ItemList",
          numberOfItems: itemUrls.length,
          itemListElement: items.map((url, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url,
          })),
        };

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: canonical,
    inLanguage: "en-US",
    isPartOf: { "@id": `${SITE_URL}#website` },
    publisher: { "@id": `${SITE_URL}#organization` },
    ...(mainEntity ? { mainEntity } : {}),
  };
}
