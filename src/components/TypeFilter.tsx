import { OPPORTUNITY_TYPES, type OpportunityType } from "../data/types";

interface TypeFilterProps {
  value: OpportunityType[];
  onToggle: (type: OpportunityType) => void;
}

export default function TypeFilter({ value, onToggle }: TypeFilterProps) {
  return (
    <div className="control-group">
      <span className="control-label" id="type-label">
        Kind of opportunity
      </span>
      <div className="type-pills" role="group" aria-labelledby="type-label">
        {OPPORTUNITY_TYPES.map((type) => {
          const selected = value.includes(type);
          return (
            <button
              key={type}
              type="button"
              aria-pressed={selected}
              className={`type-pill type-pill--${type.toLowerCase()}${selected ? " is-selected" : ""}`}
              onClick={() => onToggle(type)}
            >
              {type}
            </button>
          );
        })}
      </div>
    </div>
  );
}
