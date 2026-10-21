import type { ComponentType } from "react";
import { INTEREST_GROUPS, INTERESTS, type Interest } from "../data/types";
import {
  IconCode,
  IconChip,
  IconGraph,
  IconAtom,
  IconFlask,
  IconPulse,
  IconLeaf,
  IconGear,
  IconTrendUp,
  IconBriefcase,
  IconPen,
  IconPalette,
  IconScale,
  IconBrain,
  IconMic,
  IconHeart,
} from "./icons";

const ICONS: Record<Interest, ComponentType<{ className?: string }>> = {
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

interface InterestFilterProps {
  value: Interest[];
  onToggle: (interest: Interest) => void;
}

export default function InterestFilter({ value, onToggle }: InterestFilterProps) {
  return (
    <div className="control-group">
      <span className="control-label">Your interests</span>
      <div className="interest-groups">
        {INTEREST_GROUPS.map((group) => (
          <div className="interest-group" key={group}>
            <span className="interest-group-label">{group}</span>
            <div className="interest-pills" role="group" aria-label={group}>
              {INTERESTS.filter((i) => i.group === group).map((interest) => {
                const selected = value.includes(interest.id);
                const Icon = ICONS[interest.id];
                return (
                  <button
                    key={interest.id}
                    type="button"
                    aria-pressed={selected}
                    className={`interest-pill${selected ? " is-selected" : ""}`}
                    onClick={() => onToggle(interest.id)}
                  >
                    <Icon className="interest-pill-icon" />
                    {interest.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
