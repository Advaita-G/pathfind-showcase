import { getTrust } from "../lib/planner/trust";
import type { Opportunity } from "../data/types";

export default function TrustBadge({ opportunity, today }: { opportunity: Opportunity; today?: Date }) {
  const trust = getTrust(opportunity, today);
  return (
    <span className={`trust-badge trust-badge--${trust.level}`} title={trust.detail}>
      <span className="trust-badge-dot" aria-hidden="true" />
      {trust.label}
    </span>
  );
}
