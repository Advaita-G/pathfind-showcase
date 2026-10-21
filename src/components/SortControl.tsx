import { SORTS, type SortBy } from "../data/types";

const LABELS: Record<SortBy, string> = {
  deadline: "Deadline",
  type: "Type",
  grade: "Grade",
};

interface SortControlProps {
  value: SortBy;
  onChange: (sortBy: SortBy) => void;
}

export default function SortControl({ value, onChange }: SortControlProps) {
  return (
    <div className="sort-control" role="radiogroup" aria-label="Sort opportunities by">
      <span className="sort-label">Sort by</span>
      <div className="sort-options">
        {SORTS.map((sort) => (
          <button
            key={sort}
            type="button"
            role="radio"
            aria-checked={value === sort}
            className={`sort-option${value === sort ? " is-selected" : ""}`}
            onClick={() => onChange(sort)}
          >
            {LABELS[sort]}
          </button>
        ))}
      </div>
    </div>
  );
}
