import type { SVGProps } from "react";

const base: SVGProps<SVGSVGElement> = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function IconCode(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M8 6 2 12l6 6" />
      <path d="M16 6l6 6-6 6" />
    </svg>
  );
}

export function IconGraph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M4 4v16h16" />
      <path d="M7 16c2-6 5-9 6-9s2 3 6 3" />
    </svg>
  );
}

export function IconFlask(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M10 3h4" />
      <path d="M10.5 3v6.2L5.8 18a1.5 1.5 0 0 0 1.3 2.3h9.8a1.5 1.5 0 0 0 1.3-2.3L13.5 9.2V3" />
      <path d="M8.2 15h7.6" />
    </svg>
  );
}

export function IconTrendUp(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M3 17 9 11l4 4 8-10" />
      <path d="M15 5h6v6" />
    </svg>
  );
}

export function IconGear(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 3v2.4M12 18.6V21M4.9 6.4l1.7 1.7M17.4 15.9l1.7 1.7M3 12h2.4M18.6 12H21M4.9 17.6l1.7-1.7M17.4 8.1l1.7-1.7" />
    </svg>
  );
}

export function IconLeaf(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M20 4C10 4 4 10 4 18v2h2c8 0 14-6 14-14V4z" />
      <path d="M6 20c3-6 8-10 13-12" />
    </svg>
  );
}

export function IconAtom(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <ellipse cx="12" cy="12" rx="9" ry="3.6" />
      <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(120 12 12)" />
    </svg>
  );
}

export function IconPulse(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M2 12h4l1.8-4.5L11 17l2-10 2.2 5H22" />
    </svg>
  );
}

export function IconBriefcase(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="7.5" width="18" height="12" rx="2" />
      <path d="M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5" />
      <path d="M3 13h18" />
    </svg>
  );
}

export function IconBrain(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M9 4.5c-2 0-3.2 1.5-3 3.2-1.4.6-2 2.1-1.5 3.5-1 .8-1.2 2.4-.2 3.4-.4 1.6.7 3.2 2.4 3.3.4 1.3 1.7 2.1 3 1.9V4.7A3 3 0 0 0 9 4.5z" />
      <path d="M15 4.5c2 0 3.2 1.5 3 3.2 1.4.6 2 2.1 1.5 3.5 1 .8 1.2 2.4.2 3.4.4 1.6-.7 3.2-2.4 3.3-.4 1.3-1.7 2.1-3 1.9V4.7a3 3 0 0 1 .7-.2z" />
    </svg>
  );
}

export function IconScale(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3v18M7 21h10" />
      <path d="M4 7h6M14 7h6" />
      <path d="M4 7l-2.5 5a2.6 2.6 0 0 0 5 0L4 7z" />
      <path d="M20 7l-2.5 5a2.6 2.6 0 0 0 5 0L20 7z" />
    </svg>
  );
}

export function IconPen(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M4 20l1-4.6L15.4 5 19 8.6 8.6 19 4 20z" />
      <path d="M13 7l4 4" />
    </svg>
  );
}

export function IconPalette(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3a9 8 0 0 0 0 16c1.2 0 1.6-.9.9-1.8-.5-.6-.1-1.5.8-1.5H16a4 3.6 0 0 0 4-3.6C20 6.7 16.4 3 12 3z" />
      <circle cx="8" cy="10.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="8" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="16" cy="10.5" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconMic(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
      <path d="M12 17.5V21M9 21h6" />
    </svg>
  );
}

export function IconHeart(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M12 20s-7.5-4.6-9.8-9C.5 7.6 2.5 4 6 4c2.1 0 3.6 1.2 4.5 2.6.4.6.8.6 1 0C12.4 5.2 13.9 4 16 4c3.5 0 5.5 3.6 3.8 7-2.3 4.4-9.8 9-9.8 9z" />
    </svg>
  );
}

export function IconChip(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <rect x="6.5" y="6.5" width="11" height="11" rx="1.5" />
      <rect x="10" y="10" width="4" height="4" />
      <path d="M9 3v2.3M15 3v2.3M9 18.7V21M15 18.7V21M3 9h2.3M3 15h2.3M18.7 9H21M18.7 15H21" />
    </svg>
  );
}

export function IconSearch(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M20 20l-4.8-4.8" />
    </svg>
  );
}

export function IconBookmark({
  filled,
  ...props
}: SVGProps<SVGSVGElement> & { filled?: boolean }) {
  return (
    <svg {...base} fill={filled ? "currentColor" : "none"} {...props}>
      <path d="M6 3.5h12a.5.5 0 0 1 .5.5v16.2a.5.5 0 0 1-.77.42L12 16.8l-5.73 3.82a.5.5 0 0 1-.77-.42V4a.5.5 0 0 1 .5-.5z" />
    </svg>
  );
}

export function IconPin(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M12 21s7-6.4 7-11.5A7 7 0 0 0 5 9.5C5 14.6 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.3" />
    </svg>
  );
}

export function IconClose(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M5 5l14 14M19 5 5 19" />
    </svg>
  );
}
