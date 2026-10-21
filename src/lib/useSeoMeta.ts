import { useEffect } from "react";
import type { PageMeta } from "../seo/meta";

function setMetaContent(selector: string, value: string): void {
  const tag = document.head.querySelector(selector);
  if (tag) tag.setAttribute("content", value);
}

/**
 * Applies route metadata after client-side navigation. The prerendered HTML already
 * carries the correct tags for a direct visit; this keeps them correct when a student
 * (or a crawler that runs JS) moves between pages inside the SPA.
 */
export function useSeoMeta(meta: PageMeta): void {
  useEffect(() => {
    document.title = meta.title;

    setMetaContent('meta[name="description"]', meta.description);
    setMetaContent('meta[property="og:title"]', meta.title);
    setMetaContent('meta[property="og:description"]', meta.description);
    setMetaContent('meta[property="og:url"]', meta.canonical);
    setMetaContent('meta[name="twitter:title"]', meta.title);
    setMetaContent('meta[name="twitter:description"]', meta.description);
    setMetaContent('meta[name="twitter:url"]', meta.canonical);

    let canonicalTag = document.head.querySelector('link[rel="canonical"]');
    if (!canonicalTag) {
      canonicalTag = document.createElement("link");
      canonicalTag.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalTag);
    }
    canonicalTag.setAttribute("href", meta.canonical);

    const robotsTag = document.head.querySelector('meta[name="robots"]');
    if (robotsTag) {
      robotsTag.setAttribute("content", meta.robotsNoindex ? "noindex, follow" : "index, follow");
    }

    return () => {
      if (robotsTag) robotsTag.setAttribute("content", "index, follow");
    };
  }, [meta.title, meta.description, meta.canonical, meta.robotsNoindex]);
}
