import { ArrowUpRight } from "lucide-react";
import { INTERESTS, type Opportunity } from "../data/types";
import { DeadlineMeta } from "./OpportunityCard";
import OpportunityCard from "./OpportunityCard";
import { IconBookmark, IconPin } from "./icons";

interface SpotlightSectionProps {
  opportunities: Opportunity[];
  bookmarks: string[];
  onToggleBookmark: (id: string) => void;
  onOpenDetail?: (opportunity: Opportunity) => void;
}

export default function SpotlightSection({ opportunities, bookmarks, onToggleBookmark, onOpenDetail }: SpotlightSectionProps) {
  if (opportunities.length === 0) return null;
  const [spotlight, ...supporting] = opportunities.slice(0, 3);
  const gradeRange = spotlight.minGrade === spotlight.maxGrade
    ? `Grade ${spotlight.minGrade}`
    : `Grades ${spotlight.minGrade}–${spotlight.maxGrade}`;

  return (
    <section className="spotlight-section" aria-labelledby="spotlight-heading">
      <header className="spotlight-header">
        <span className="spotlight-index">01 / Featured</span>
        <div>
          <h2 id="spotlight-heading" className="spotlight-title">Worth a closer look.</h2>
          <p className="spotlight-subtitle">One standout, plus two more directions to follow.</p>
        </div>
      </header>

      <div className="spotlight-editorial">
        <article className="spotlight-feature">
          <div className="spotlight-feature-topline">
            <span>{spotlight.type}</span>
            <button
              type="button"
              className={`op-card-bookmark${bookmarks.includes(spotlight.id) ? " is-saved" : ""}`}
              aria-pressed={bookmarks.includes(spotlight.id)}
              aria-label={bookmarks.includes(spotlight.id) ? `Remove ${spotlight.title} from saved` : `Save ${spotlight.title}`}
              onClick={() => onToggleBookmark(spotlight.id)}
            >
              <IconBookmark filled={bookmarks.includes(spotlight.id)} />
            </button>
          </div>
          <p className="spotlight-feature-org">{spotlight.org}</p>
          <h3>
            {onOpenDetail ? (
              <button type="button" className="spotlight-feature-title-btn" onClick={() => onOpenDetail(spotlight)}>
                {spotlight.title}
              </button>
            ) : (
              spotlight.title
            )}
          </h3>
          <div className="spotlight-feature-why">
            <span>Why it matters</span>
            <p>{spotlight.description}</p>
          </div>
          <div className="spotlight-feature-interests">
            {spotlight.interests.slice(0, 4).map((interest) => (
              <span key={interest}>{INTERESTS.find((item) => item.id === interest)?.label}</span>
            ))}
          </div>
          <div className="spotlight-feature-facts">
            <div><span>Eligibility</span><strong>{gradeRange}</strong></div>
            <div><span>Format</span><strong><IconPin aria-hidden="true" />{spotlight.location}</strong></div>
            <div><span>Cost</span><strong>{spotlight.free ? "Tuition-free" : "Tuition-based"}</strong></div>
          </div>
          <div className="spotlight-feature-footer">
            <DeadlineMeta opportunity={spotlight} />
            {onOpenDetail ? (
              <button type="button" className="spotlight-feature-visit-btn" onClick={() => onOpenDetail(spotlight)}>
                View details <ArrowUpRight size={17} aria-hidden="true" />
              </button>
            ) : (
              <a href={spotlight.link} target="_blank" rel="noreferrer">
                View official program <ArrowUpRight size={17} aria-hidden="true" />
              </a>
            )}
          </div>
        </article>

        {supporting.length > 0 && (
          <div className="spotlight-supporting" aria-label="More featured opportunities">
            {supporting.map((opportunity, index) => (
              <div key={opportunity.id} className="spotlight-supporting-item">
                <span className="spotlight-supporting-number">0{index + 2}</span>
                <OpportunityCard opportunity={opportunity} bookmarked={bookmarks.includes(opportunity.id)} onToggleBookmark={onToggleBookmark} variant="curated" index={index + 1} onOpenDetail={onOpenDetail} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
