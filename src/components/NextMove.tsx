import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { OPPORTUNITIES } from "../data/opportunities";
import { DEMO_PATHFIND_IDEAS } from "../data/pathfindIdeas";
import { usePlans } from "../context/PlansContext";
import { computeNextMoves, type NextMove as Move } from "../lib/nextMoves";
import type { IdeaProgressState } from "../lib/ideaProgress";
import { useToday } from "../lib/useToday";
import type { PathProfile } from "../lib/usePathProfile";
import { useStudentBasics } from "../lib/planner/useStudentBasics";

interface Props {
  profile: PathProfile;
  bookmarks: string[];
  ideaProgress: IdeaProgressState;
  onToggleIdeaStep: (ideaId: string, stepIndex: number) => void;
  /** Opens Build My Path. Omit where that is not reachable. */
  onBuildPath?: () => void;
}

/** The three best things to do next, built from saved work, plans, deadlines and the student's profile. */
export default function NextMove({ profile, bookmarks, ideaProgress, onToggleIdeaStep, onBuildPath }: Props) {
  const { plans, savePlan } = usePlans();
  const today = useToday();
  const { grade } = useStudentBasics();

  const moves = useMemo(
    () => computeNextMoves({ today, profile, grade, opportunities: OPPORTUNITIES, bookmarks, plans, ideas: DEMO_PATHFIND_IDEAS, ideaProgress }),
    [today, profile, grade, bookmarks, plans, ideaProgress],
  );

  const complete = (move: Move) => {
    const c = move.complete;
    if (!c) return;
    if (c.type === "idea-step") {
      onToggleIdeaStep(c.ideaId, c.stepIndex);
      return;
    }
    const plan = plans[c.opportunityId];
    if (!plan) return;
    savePlan({ ...plan, steps: plan.steps.map((s) => (s.id === c.stepId ? { ...s, done: true } : s)) });
  };

  const hasWork = moves.some((m) => m.kind !== "build-path" && m.kind !== "discover");

  return (
    <section className="next-move" aria-labelledby="next-move-heading">
      <div className="next-move-head">
        <h2 id="next-move-heading">Your next move</h2>
        <p>{hasWork ? "Pick up where you left off." : "Three ways to get started."}</p>
      </div>
      <ol className="next-move-list">
        {moves.map((move, index) => (
          <motion.li
            key={move.id}
            layout
            className={`next-move-card kind-${move.kind}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
          >
            <span className="next-move-num" aria-hidden="true">{index + 1}</span>
            <div className="next-move-body">
              {move.badge && <span className="next-move-badge">{move.badge}</span>}
              <h3>{move.title}</h3>
              <p>{move.why}</p>
            </div>
            <div className="next-move-actions">
              {move.complete && (
                <button type="button" className="next-move-primary" onClick={() => complete(move)}>{move.cta}</button>
              )}
              {!move.complete && move.href && (
                <Link className="next-move-primary" to={move.href}>{move.cta}</Link>
              )}
              {!move.complete && !move.href && onBuildPath && (
                <button type="button" className="next-move-primary" onClick={onBuildPath}>{move.cta}</button>
              )}
              {move.complete && move.href && (
                <Link className="next-move-link" to={move.href}>Open</Link>
              )}
            </div>
          </motion.li>
        ))}
      </ol>
    </section>
  );
}
