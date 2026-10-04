import type { ReactNode } from "react";

type IconName =
  | "layout"
  | "chart"
  | "habit"
  | "tasks"
  | "target"
  | "play"
  | "pause"
  | "reset"
  | "settings"
  | "plus"
  | "chevron"
  | "trash"
  | "book"
  | "clock"
  | "spark"
  | "radio"
  | "volume"
  | "arrow"
  | "close"
  | "fire"
  | "headphones"
  | "calendar"
  | "coffee"
  | "move"
  | "check"
  | "dots"
  | "signal"
  | "water"
  | "dumbbell"
  | "moon"
  | "sun"
  | "leaf"
  | "sliders";

type IconProps = {
  name: IconName;
  size?: number;
  className?: string;
};

const glyphs: Record<IconName, ReactNode> = {
  layout: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></>,
  chart: <><path d="M4 19.5V11" /><path d="M10 19.5V5" /><path d="M16 19.5v-8" /><path d="M22 19.5V8" /><path d="M2.5 20.5h21" /></>,
  habit: <><path d="m5 12.5 4.2 4.2L19.5 6.5" /><path d="M20 12v6.5A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5v-13A1.5 1.5 0 0 1 5.5 4H15" /></>,
  tasks: <><rect x="4" y="4" width="16" height="16" rx="2.5" /><path d="M8 8.5h8M8 12.5h8M8 16.5h4" /></>,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
  play: <path d="m9 6.5 9 5.5-9 5.5z" fill="currentColor" stroke="none" />,
  pause: <><path d="M9 6.5v11" strokeWidth="2.5" /><path d="M15 6.5v11" strokeWidth="2.5" /></>,
  reset: <><path d="M3.5 12a8.5 8.5 0 1 0 2.4-5.9L3.5 8.5" /><path d="M3.5 3.5v5h5" /><path d="M12 7.5V12l3 1.8" /></>,
  settings: <><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" /><path d="m19.3 13.5 1.3 1-.9 2.4-1.7-.1a7.2 7.2 0 0 1-1.5 1l-.4 1.7h-2.6l-.5-1.7a7.2 7.2 0 0 1-1.7-.4l-1.4 1-2.1-1.5.4-1.7a7.4 7.4 0 0 1-.8-1.6l-1.7-.5v-2.6l1.7-.4c.2-.6.5-1.1.8-1.6l-.4-1.7 2.1-1.5 1.4 1a7.2 7.2 0 0 1 1.7-.4l.5-1.7h2.6l.4 1.7a7.2 7.2 0 0 1 1.5 1l1.7-.1.9 2.4-1.3 1a7 7 0 0 1 0 2.1Z" transform="translate(-1 -1) scale(.92)" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  chevron: <path d="m7 10 5 5 5-5" />,
  trash: <><path d="M4 7h16M10 11v6M14 11v6" /><path d="m6 7 .7 13h10.6L18 7M9 7V4h6v3" /></>,
  book: <><path d="M4.5 5.5A2.5 2.5 0 0 1 7 3h13v16H7a2.5 2.5 0 0 0-2.5 2V5.5Z" /><path d="M4.5 17.5A2.5 2.5 0 0 1 7 15h13M9 7h7M9 10h5" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>,
  spark: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" /></>,
  radio: <><rect x="3" y="6" width="18" height="14" rx="2.5" /><path d="m5.5 6 13-3M7 15h.01M11 15h.01M15 15h2M7 11h10" /></>,
  volume: <><path d="M4 10v4h3l4 3.5v-11L7 10H4Z" /><path d="M15 9a4 4 0 0 1 0 6M17.5 6.5a7.5 7.5 0 0 1 0 11" /></>,
  arrow: <><path d="M7 17 17 7M7.5 7H17v9.5" /></>,
  close: <><path d="m6 6 12 12M18 6 6 18" /></>,
  fire: <><path d="M12 22c4.2 0 7-2.8 7-6.5 0-2.6-1.5-4.5-3.9-6.6.2 2.1-1.3 3-2.2 3.4C12.5 7.3 10 3.8 7 2c.4 4-2 6.8-2 10.7C5 17.2 7.8 22 12 22Z" /><path d="M12 18.5c1.6 0 2.7-1.1 2.7-2.7 0-1-.6-1.8-1.6-2.8-.1 1-.8 1.4-1.2 1.5-.2-1.3-.9-2.2-1.7-2.8.1 1.5-.9 2.5-.9 4.1 0 1.5 1.1 2.7 2.7 2.7Z" /></>,
  headphones: <><path d="M4 13v-2a8 8 0 0 1 16 0v2" /><rect x="3" y="12" width="4" height="7" rx="2" /><rect x="17" y="12" width="4" height="7" rx="2" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="16" rx="2" /><path d="M16 3v4M8 3v4M3.5 10h17M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" /></>,
  coffee: <><path d="M5 8h12v7a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8ZM17 10h1.5a2.5 2.5 0 0 1 0 5H17" /><path d="M8 4c0 1 1 1 1 2M12 3c0 1 1 1 1 2" /></>,
  move: <><path d="M12 3v18M3 12h18" /><path d="m8 7 4-4 4 4M8 17l4 4 4-4M7 8l-4 4 4 4M17 8l4 4-4 4" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7" />,
  dots: <><circle cx="5" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="19" cy="12" r="1" fill="currentColor" /></>,
  signal: <><path d="M3 16.5a13 13 0 0 1 18 0M6 13a9 9 0 0 1 12 0M9.5 9.5a4 4 0 0 1 5 0M12 19h.01" /></>,
  water: <><path d="M12 3.5S5.5 10.2 5.5 14.7a6.5 6.5 0 1 0 13 0C18.5 10.2 12 3.5 12 3.5Z" /><path d="M9 15.5c.3 1.2 1.2 1.8 2.5 2" /></>,
  dumbbell: <><path d="M6.5 9v6M17.5 9v6M4 10v4M20 10v4M6.5 12h11" /><path d="M3 9v6M21 9v6" /></>,
  moon: <path d="M20.5 15.3A8.5 8.5 0 0 1 8.7 3.5a8.8 8.8 0 1 0 11.8 11.8Z" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  leaf: <><path d="M20 4c-8.5 0-14 3.5-14 10a6 6 0 0 0 6 6c6.5 0 8-7 8-16Z" /><path d="M4 21c2-5 5-8 10-11" /></>,
  sliders: <><path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></>,
};

export function Icon({ name, size = 18, className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {glyphs[name]}
    </svg>
  );
}
