import { type Opportunity } from "../data/types";
import OpportunityCard from "./OpportunityCard";

interface CuratedCollectionProps {
  title: string;
  subtitle: string;
  opportunities: Opportunity[];
  bookmarks: string[];
  onToggleBookmark: (id: string) => void;
  onOpenDetail?: (opportunity: Opportunity) => void;
  /** Controls the section's background band, giving the page rhythm instead
   * of every section sitting flat on the same off-white. */
  tone?: "raised" | "moss";
}

export default function CuratedCollection({
  title,
  subtitle,
  opportunities,
  bookmarks,
  onToggleBookmark,
  onOpenDetail,
  tone = "raised",
}: CuratedCollectionProps) {
  if (opportunities.length === 0) return null;

  return (
    <section className={`curated-collection-section curated-collection-section--${tone}`}>
      <div className="curated-collection-header">
        <h2 className="curated-collection-title">{title}</h2>
        <p className="curated-collection-subtitle">{subtitle}</p>
      </div>

      <div className="curated-collection-grid">
        {opportunities.slice(0, 4).map((opportunity, index) => (
          <OpportunityCard
            key={opportunity.id}
            opportunity={opportunity}
            bookmarked={bookmarks.includes(opportunity.id)}
            onToggleBookmark={onToggleBookmark}
            variant="curated"
            index={index}
            onOpenDetail={onOpenDetail}
          />
        ))}
      </div>
    </section>
  );
}
