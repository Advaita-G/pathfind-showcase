import { GRADES } from "../data/types";

interface GradeSelectProps {
  value: number | null;
  onChange: (grade: number) => void;
}

export default function GradeSelect({ value, onChange }: GradeSelectProps) {
  return (
    <div className="control-group" role="radiogroup" aria-label="Your grade">
      <span className="control-label">Your grade</span>
      <div className="grade-select">
        {GRADES.map((grade) => (
          <button
            key={grade}
            type="button"
            role="radio"
            aria-checked={value === grade}
            className={`grade-chip${value === grade ? " is-selected" : ""}`}
            onClick={() => onChange(grade)}
          >
            {grade}
          </button>
        ))}
      </div>
    </div>
  );
}
