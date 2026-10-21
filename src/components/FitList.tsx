import { useMemo } from "react";
import type { Opportunity } from "../data/types";
import { usePathProfile } from "../lib/usePathProfile";
import { explainFit, type FitTone } from "../lib/planner/whyItFits";
import { useStudentBasics } from "../lib/planner/useStudentBasics";

const MARK: Record<FitTone, string> = { match: "Fits", mismatch: "Check", unknown: "Unknown" };

export default function FitList({ opportunity }: { opportunity: Opportunity }) {
  const { profile } = usePathProfile();
  const basics = useStudentBasics();
  const points = useMemo(
    () => explainFit(opportunity, profile, { grade: basics.grade, state: basics.state }),
    [opportunity, profile, basics.grade, basics.state],
  );
  return (
    <ul className="fit-list" aria-label="How this fits you">
      {points.map((p, i) => (
        <li key={i} className={`fit-point fit-point--${p.tone}`}>
          <span className="fit-point-tag">{MARK[p.tone]}</span>
          <span>{p.text}</span>
        </li>
      ))}
    </ul>
  );
}
