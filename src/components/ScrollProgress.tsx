import { motion, type MotionValue } from "motion/react";

interface ScrollProgressProps {
  scrollYProgress: MotionValue<number>;
}

export default function ScrollProgress({ scrollYProgress }: ScrollProgressProps) {
  return (
    <div className="scroll-progress-track" aria-hidden="true">
      <motion.div className="scroll-progress-fill" style={{ scaleX: scrollYProgress }} />
    </div>
  );
}
