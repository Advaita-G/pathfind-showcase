import type { ComponentType } from "react";
import type { Interest } from "../data/types";
import {
  IconAtom,
  IconBrain,
  IconBriefcase,
  IconChip,
  IconCode,
  IconFlask,
  IconGear,
  IconGraph,
  IconHeart,
  IconLeaf,
  IconMic,
  IconPalette,
  IconPen,
  IconPulse,
  IconScale,
  IconTrendUp,
} from "../components/icons";

/** Shared across ExploreByInterest and BuildMyPath so both use one icon per interest. */
export const INTEREST_ICONS: Record<Interest, ComponentType<{ className?: string }>> = {
  cs: IconCode,
  ai: IconChip,
  math: IconGraph,
  physics: IconAtom,
  chemistry: IconFlask,
  biology: IconPulse,
  environmental: IconLeaf,
  engineering: IconGear,
  finance: IconTrendUp,
  entrepreneurship: IconBriefcase,
  writing: IconPen,
  arts: IconPalette,
  law: IconScale,
  psychology: IconBrain,
  debate: IconMic,
  service: IconHeart,
};
