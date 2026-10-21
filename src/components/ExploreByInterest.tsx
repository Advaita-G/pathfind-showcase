import { ArrowRight } from "lucide-react";
import { OPPORTUNITIES } from "../data/opportunities";
import { INTERESTS, type Interest } from "../data/types";

interface ExploreByInterestProps {
  onSelectInterest: (interest: Interest) => void;
}

const INTEREST_DESTINATIONS = INTERESTS.map((interest) => ({
  ...interest,
  count: OPPORTUNITIES.filter((opportunity) => opportunity.interests.includes(interest.id)).length,
}))
  .filter((interest) => interest.count > 0)
  .sort((a, b) => b.count - a.count);

export default function ExploreByInterest({ onSelectInterest }: ExploreByInterestProps) {
  return (
    <section className="explore-interests-section" aria-labelledby="explore-interests-heading">
      <header className="explore-interests-header">
        <p className="explore-interests-eyebrow">Explore interests</p>
        <h2 id="explore-interests-heading" className="explore-interests-title">Follow your curiosity.</h2>
        <p className="explore-interests-subtitle">Each line opens a real slice of the catalog.</p>
      </header>
      <div className="interest-destination-list">
        {INTEREST_DESTINATIONS.map((interest, index) => (
          <button key={interest.id} type="button" onClick={() => onSelectInterest(interest.id)}>
            <span className="interest-destination-number">{String(index + 1).padStart(2, "0")}</span>
            <span className="interest-destination-title">{interest.label}</span>
            <span className="interest-destination-group">{interest.group}</span>
            <span className="interest-destination-count">{interest.count}</span>
            <ArrowRight size={20} aria-hidden="true" />
          </button>
        ))}
      </div>
    </section>
  );
}
