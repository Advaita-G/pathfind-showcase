import { ArrowUpRight, Bookmark, Info } from "lucide-react";
import type { Opportunity } from "../data/types";
import { daysUntil, formatDeadline } from "../lib/formatDeadline";

interface ClosingSoonRailProps {
  opportunities: Opportunity[];
  bookmarks: string[];
  onToggleBookmark: (id: string) => void;
  onOpenDetail?: (opportunity: Opportunity) => void;
}

export default function ClosingSoonRail({ opportunities, bookmarks, onToggleBookmark, onOpenDetail }: ClosingSoonRailProps) {
  if (opportunities.length === 0) return null;

  return (
    <section className="closing-soon-section" aria-labelledby="closing-soon-heading">
      <header className="closing-soon-header">
        <div>
          <p className="closing-soon-eyebrow">Time-sensitive</p>
          <h2 id="closing-soon-heading" className="closing-soon-title">Closing soon</h2>
        </div>
        <p className="closing-soon-subtitle">Check the official program page before you apply.</p>
      </header>
      <div className="closing-soon-list">
        {opportunities.slice(0, 5).map((opportunity) => {
          const days = daysUntil(opportunity.deadline!);
          return (
            <article key={opportunity.id} className="deadline-row">
              <div className="deadline-row-time">
                <strong>{days}</strong>
                <span>{days === 1 ? "day" : "days"}</span>
              </div>
              <div className="deadline-row-main">
                <span className="deadline-row-status">
                  {opportunity.deadlineConfirmed === false ? "Estimated deadline" : "Confirmed deadline"}
                  <em>{formatDeadline(opportunity.deadline!)}</em>
                </span>
                <h3>
                  {onOpenDetail ? (
                    <button type="button" className="closing-soon-title-btn" onClick={() => onOpenDetail(opportunity)}>
                      {opportunity.title}
                    </button>
                  ) : (
                    <a href={opportunity.link} target="_blank" rel="noreferrer">{opportunity.title}</a>
                  )}
                </h3>
                <p>{opportunity.org} · {opportunity.type}</p>
              </div>
              <div className="deadline-row-actions">
                <button type="button" className={bookmarks.includes(opportunity.id) ? "is-saved" : ""} aria-pressed={bookmarks.includes(opportunity.id)} aria-label={bookmarks.includes(opportunity.id) ? `Remove ${opportunity.title} from saved` : `Save ${opportunity.title}`} onClick={() => onToggleBookmark(opportunity.id)}>
                  <Bookmark size={18} fill={bookmarks.includes(opportunity.id) ? "currentColor" : "none"} />
                </button>
                {onOpenDetail ? (
                  <button type="button" className="closing-soon-info-btn" aria-label={`Learn about ${opportunity.title}`} onClick={() => onOpenDetail(opportunity)}>
                    <Info size={20} />
                  </button>
                ) : (
                  <a href={opportunity.link} target="_blank" rel="noreferrer" aria-label={`View ${opportunity.title} on the official site`}><ArrowUpRight size={20} /></a>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
