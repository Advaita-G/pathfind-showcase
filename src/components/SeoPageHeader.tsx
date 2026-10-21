import { Link } from "react-router-dom";
import { BRAND_ASSETS, LOCKUP_HEIGHT, LOCKUP_WIDTH } from "../brand/assets";

export default function SeoPageHeader() {
  return (
    <header className="seo-page-header">
      <div className="seo-page-header-inner">
        <Link to="/" className="seo-page-header-brand" aria-label="Pathfind home">
          <img
            className="seo-page-header-brandmark"
            src={BRAND_ASSETS.logoLight}
            alt="Pathfind"
            width={LOCKUP_WIDTH}
            height={LOCKUP_HEIGHT}
          />
        </Link>
        <nav className="seo-page-header-links" aria-label="Site">
          <Link to="/opportunities">Explore all opportunities</Link>
          <Link to="/guides">Guides</Link>
          <Link to="/plans">Plans</Link>
        </nav>
      </div>
    </header>
  );
}
