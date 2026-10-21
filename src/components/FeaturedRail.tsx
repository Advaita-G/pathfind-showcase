import { useRef } from "react";
import type { Opportunity } from "../data/types";
import OpportunityCard from "./OpportunityCard";

interface FeaturedRailProps {
  title: string;
  subtitle?: string;
  opportunities: Opportunity[];
  bookmarks: string[];
  onToggleBookmark: (id: string) => void;
  featureFirst?: boolean;
}

export default function FeaturedRail({
  title,
  subtitle,
  opportunities,
  bookmarks,
  onToggleBookmark,
  featureFirst = false,
}: FeaturedRailProps) {
  const railRef = useRef<HTMLDivElement | null>(null);

  const scrollByCard = (direction: -1 | 1) => {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({ left: direction * (rail.clientWidth * 0.8), behavior: "smooth" });
  };

  if (opportunities.length === 0) return null;

  const [first, ...rest] = opportunities;
  const railItems = featureFirst ? rest : opportunities;

  return (
    <section className="landing-section">
      <div className="landing-section-header">
        <h2 className="landing-section-title">{title}</h2>
        {subtitle && <p className="landing-section-subtitle">{subtitle}</p>}
      </div>

      <div className="featured-rail-wrap">
        {featureFirst && first && (
          <div className="feature-card-slot">
            <OpportunityCard
              opportunity={first}
              bookmarked={bookmarks.includes(first.id)}
              onToggleBookmark={onToggleBookmark}
              variant="spotlight"
              index={0}
            />
          </div>
        )}

        {railItems.length > 0 && (
          <>
            <div className="featured-rail" ref={railRef}>
              {railItems.map((opportunity, index) => (
                <div className="featured-rail-item" key={opportunity.id}>
                  <OpportunityCard
                    opportunity={opportunity}
                    bookmarked={bookmarks.includes(opportunity.id)}
                    onToggleBookmark={onToggleBookmark}
                    index={index}
                  />
                </div>
              ))}
            </div>
            <div className="featured-rail-controls">
              <button
                type="button"
                className="rail-button"
                aria-label={`Scroll ${title} left`}
                onClick={() => scrollByCard(-1)}
              >
                ←
              </button>
              <button
                type="button"
                className="rail-button"
                aria-label={`Scroll ${title} right`}
                onClick={() => scrollByCard(1)}
              >
                →
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
