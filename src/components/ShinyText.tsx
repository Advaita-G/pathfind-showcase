import { motion } from "motion/react";
import type { CSSProperties } from "react";

interface ShinyTextProps {
  text: string;
  baseColor?: string;
  shineColor?: string;
  speed?: number;
  angle?: number;
  className?: string;
}

export default function ShinyText({
  text,
  baseColor = "var(--accent-strong)",
  shineColor = "#ffffff",
  speed = 3,
  angle = 100,
  className = "",
}: ShinyTextProps) {
  return (
    <motion.span
      className={`shiny-text ${className}`}
      style={
        {
          "--shiny-angle": `${angle}deg`,
          backgroundImage: `linear-gradient(${angle}deg, ${baseColor} 40%, ${shineColor} 50%, ${baseColor} 60%)`,
          backgroundSize: "300% 100%",
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          color: "transparent",
          WebkitTextFillColor: "transparent",
        } as CSSProperties
      }
      animate={{ backgroundPositionX: ["150%", "-150%"] }}
      transition={{ duration: speed, repeat: Infinity, ease: "linear" }}
    >
      {text}
    </motion.span>
  );
}
