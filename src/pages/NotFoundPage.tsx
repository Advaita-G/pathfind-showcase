import { Link } from "react-router-dom";
import SeoPageHeader from "../components/SeoPageHeader";
import { notFoundMeta } from "../seo/meta";
import { useSeoMeta } from "../lib/useSeoMeta";

export default function NotFoundPage() {
  useSeoMeta(notFoundMeta());

  return (
    <div className="seo-page">
      <SeoPageHeader />
      <main className="content seo-page-content">
        <p className="seo-eyebrow">404</p>
        <h1>We couldn't find that page</h1>
        <p className="seo-page-lede">
          The link might be old, or the program may have moved. Here's where to pick back up:
        </p>
        <ul className="seo-not-found-links">
          <li>
            <Link to="/opportunities">Browse all verified opportunities</Link>
          </li>
          <li>
            <Link to="/research-programs">Research programs</Link>
          </li>
          <li>
            <Link to="/competitions">Competitions</Link>
          </li>
          <li>
            <Link to="/free-programs">Free programs</Link>
          </li>
          <li>
            <Link to="/guides">Guides for finding opportunities</Link>
          </li>
          <li>
            <Link to="/">Back to Pathfind</Link>
          </li>
        </ul>
      </main>
    </div>
  );
}
