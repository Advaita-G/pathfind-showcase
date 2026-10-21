import {
  motion,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "motion/react";
import { OPPORTUNITIES } from "../data/opportunities";

const FEATURED_NODES = OPPORTUNITIES.filter((opportunity) => opportunity.featured).slice(0, 4);

const MAIN_ROUTE = "M74 116C188 58 267 106 350 212C422 302 453 344 534 292C619 237 657 107 776 128";
const BRANCHES = [
  "M74 116C151 160 196 230 244 338",
  "M244 338C320 394 377 457 488 520",
  "M350 212C420 122 527 72 642 72",
  "M534 292C623 370 685 425 782 472",
  "M350 212C286 273 211 333 111 384",
];
const TRAIL_X = [74, 195, 350, 534, 776];
const TRAIL_Y = [116, 98, 212, 292, 128];
const TRAIL_STOPS = [0, 0.25, 0.5, 0.75, 1];

interface HeroPathSceneProps {
  chapter?: number;
  cameraProgress: MotionValue<number>;
}

export default function HeroPathScene({ chapter = 0, cameraProgress }: HeroPathSceneProps) {
  const reducedMotion = useReducedMotion();

  const farY = useTransform(cameraProgress, [0, 1], [-4, -42]);
  const branchY = useTransform(cameraProgress, [0, 1], [2, -18]);
  const routeY = useTransform(cameraProgress, [0, 1], [14, -34]);
  const nodeY = useTransform(cameraProgress, [0, 1], [22, -64]);
  const foregroundY = useTransform(cameraProgress, [0, 1], [40, -118]);
  const rotateX = useTransform(cameraProgress, [0, 0.34, 0.68, 1], [58, 48, 36, 24]);
  const cameraX = useTransform(cameraProgress, [0, 0.32, 0.68, 1], [-34, -4, 18, 42]);
  const cameraScale = useTransform(cameraProgress, [0, 0.28, 0.65, 1], [0.78, 0.95, 1.14, 1.34]);
  const trace = useTransform(cameraProgress, [0.04, 0.88], [0.08, 1]);
  const dotCx = useTransform(cameraProgress, TRAIL_STOPS, TRAIL_X);
  const dotCy = useTransform(cameraProgress, TRAIL_STOPS, TRAIL_Y);

  const emphasis = (nodeChapter: number) => {
    const distance = Math.abs(chapter - nodeChapter);
    return {
      scale: distance === 0 ? 1.08 : distance === 1 ? 1 : 0.92,
      opacity: distance === 0 ? 1 : distance === 1 ? 0.8 : 0.58,
    };
  };

  const sceneMotion = reducedMotion
    ? undefined
    : { x: cameraX, rotateX, scale: cameraScale };

  return (
    <div className="hero-depth-scene" aria-hidden="true">
      <motion.div
        className="hero-route-field hero-route-field--far"
        style={reducedMotion ? undefined : { y: farY }}
      >
        <span className="hero-route-grid" />
        <span className="hero-route-coordinate hero-route-coordinate--one">37° N / POSSIBILITY</span>
        <span className="hero-route-coordinate hero-route-coordinate--two">NEXT MOVE / 04</span>
      </motion.div>

      <motion.div className="hero-route-camera" style={sceneMotion}>
        <motion.svg
          className="hero-depth-lines"
          viewBox="0 0 820 620"
          style={reducedMotion ? undefined : { y: routeY }}
        >
          <path d={MAIN_ROUTE} className="hero-depth-main-route" />
          {BRANCHES.map((branch) => (
            <path key={branch} d={branch} className="hero-depth-branch-route" />
          ))}
          <motion.path d={MAIN_ROUTE} className="hero-depth-active" pathLength={trace} />
          {!reducedMotion && (
            <motion.circle className="hero-depth-trail-dot" r={6.5} cx={dotCx} cy={dotCy} />
          )}
        </motion.svg>

        <motion.div
          className="hero-depth-nodes hero-depth-nodes--signals"
          style={reducedMotion ? undefined : { y: branchY }}
        >
          <motion.div className="hero-depth-node hero-depth-node--college" animate={emphasis(0)}>
            <i />
            <small>DIRECTION</small>
            <b>Dream colleges</b>
          </motion.div>
          <motion.div className="hero-depth-node hero-depth-node--interest" animate={emphasis(0)}>
            <i />
            <small>SIGNAL</small>
            <b>AI + design</b>
          </motion.div>
          <motion.div className="hero-depth-node hero-depth-node--goal" animate={emphasis(1)}>
            <i />
            <small>GOAL</small>
            <b>Make an impact</b>
          </motion.div>
          <motion.div className="hero-depth-node hero-depth-node--time" animate={emphasis(1)}>
            <i />
            <small>TIME</small>
            <b>4 hours / week</b>
          </motion.div>
        </motion.div>

        <motion.div
          className="hero-depth-nodes hero-depth-nodes--opportunities"
          style={reducedMotion ? undefined : { y: nodeY }}
        >
          <motion.div className="hero-depth-node hero-depth-node--current" animate={emphasis(1)}>
            <i />
            <small>YOUR ROUTE</small>
            <b>Choose a direction</b>
          </motion.div>
          {FEATURED_NODES.map((opportunity, index) => (
            <motion.div
              key={opportunity.id}
              className={`hero-depth-node hero-depth-node--op-${index + 1}`}
              animate={emphasis(2)}
            >
              <i />
              <small>VERIFIED · {opportunity.type}</small>
              <b>{opportunity.title}</b>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          className="hero-depth-nodes hero-depth-nodes--actions"
          style={reducedMotion ? undefined : { y: foregroundY }}
        >
          <motion.div className="hero-depth-node hero-depth-node--project" animate={emphasis(3)}>
            <i />
            <small>BUILD</small>
            <b>Make something useful</b>
          </motion.div>
          <motion.div className="hero-depth-node hero-depth-node--community" animate={emphasis(3)}>
            <i />
            <small>CONTRIBUTE</small>
            <b>Teach it forward</b>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
