import { LOCATIONS, type Location } from "../data/types";

interface LocationFilterProps {
  value: Location[];
  onToggle: (location: Location) => void;
}

export default function LocationFilter({ value, onToggle }: LocationFilterProps) {
  return (
    <div className="control-group">
      <span className="control-label" id="location-label">
        Where
      </span>
      <div className="location-pills" role="group" aria-labelledby="location-label">
        {LOCATIONS.map((location) => {
          const selected = value.includes(location);
          return (
            <button
              key={location}
              type="button"
              aria-pressed={selected}
              className={`location-pill${selected ? " is-selected" : ""}`}
              onClick={() => onToggle(location)}
            >
              {location}
            </button>
          );
        })}
      </div>
    </div>
  );
}
