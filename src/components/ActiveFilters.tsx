import { INTERESTS, type Interest, type Location, type OpportunityType } from "../data/types";
import { IconClose } from "./icons";

interface ActiveFiltersProps {
  grade: number | null;
  interests: Interest[];
  types: OpportunityType[];
  locations: Location[];
  freeOnly: boolean;
  query: string;
  onRemoveGrade: () => void;
  onRemoveInterest: (interest: Interest) => void;
  onRemoveType: (type: OpportunityType) => void;
  onRemoveLocation: (location: Location) => void;
  onRemoveFreeOnly: () => void;
  onClearQuery: () => void;
  onClearAll: () => void;
}

const INTEREST_LABELS = Object.fromEntries(INTERESTS.map((i) => [i.id, i.label])) as Record<
  Interest,
  string
>;

export default function ActiveFilters({
  grade,
  interests,
  types,
  locations,
  freeOnly,
  query,
  onRemoveGrade,
  onRemoveInterest,
  onRemoveType,
  onRemoveLocation,
  onRemoveFreeOnly,
  onClearQuery,
  onClearAll,
}: ActiveFiltersProps) {
  const hasActiveFilters =
    grade !== null ||
    interests.length > 0 ||
    types.length > 0 ||
    locations.length > 0 ||
    freeOnly ||
    query.trim() !== "";

  if (!hasActiveFilters) {
    return null;
  }

  return (
    <div className="active-filters">
      <span className="active-filters-label">Active filters:</span>
      <div className="active-filters-chips">
        {grade !== null && (
          <button type="button" className="filter-chip" onClick={onRemoveGrade}>
            Grade {grade}
            <IconClose className="filter-chip-icon" aria-hidden="true" />
          </button>
        )}
        {interests.map((interest) => (
          <button
            key={interest}
            type="button"
            className="filter-chip"
            onClick={() => onRemoveInterest(interest)}
          >
            {INTEREST_LABELS[interest] ?? interest}
            <IconClose className="filter-chip-icon" aria-hidden="true" />
          </button>
        ))}
        {types.map((type) => (
          <button
            key={type}
            type="button"
            className="filter-chip"
            onClick={() => onRemoveType(type)}
          >
            {type}
            <IconClose className="filter-chip-icon" aria-hidden="true" />
          </button>
        ))}
        {locations.map((location) => (
          <button
            key={location}
            type="button"
            className="filter-chip"
            onClick={() => onRemoveLocation(location)}
          >
            {location}
            <IconClose className="filter-chip-icon" aria-hidden="true" />
          </button>
        ))}
        {freeOnly && (
          <button type="button" className="filter-chip" onClick={onRemoveFreeOnly}>
            Free only
            <IconClose className="filter-chip-icon" aria-hidden="true" />
          </button>
        )}
        {query.trim() !== "" && (
          <button type="button" className="filter-chip" onClick={onClearQuery}>
            “{query.trim()}”
            <IconClose className="filter-chip-icon" aria-hidden="true" />
          </button>
        )}
      </div>
      <button type="button" className="clear-filters" onClick={onClearAll}>
        Clear all
      </button>
    </div>
  );
}
