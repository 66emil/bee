// Иконки: одна толщина линии (1.5), один стиль.
type P = { className?: string };
const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const IconBag = ({ className = "size-6" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M5 8h14l-1.2 11.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9L5 8Z" />
    <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
  </svg>
);
export const IconSearch = ({ className = "size-6" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  </svg>
);
export const IconMenu = ({ className = "size-6" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M4 8h16M4 16h16" />
  </svg>
);
export const IconClose = ({ className = "size-6" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
);
export const IconPhone = ({ className = "size-5" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M6.6 3.5h2.6l1.3 4-2 1.4a12 12 0 0 0 6.6 6.6l1.4-2 4 1.3v2.6a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2Z" />
  </svg>
);
export const IconArrow = ({ className = "size-5" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
export const IconMinus = ({ className = "size-4" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M5 12h14" />
  </svg>
);
export const IconPlus = ({ className = "size-4" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const IconCheck = ({ className = "size-5" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);
export const IconTruck = ({ className = "size-6" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M3 6.5h11v9H3zM14 9.5h3.6l2.9 3v3H14" />
    <circle cx="7" cy="17.5" r="1.7" />
    <circle cx="17" cy="17.5" r="1.7" />
  </svg>
);
export const IconStore = ({ className = "size-6" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M4 10v10h16V10M3 10l1.5-5h15L21 10M3 10h18M9.5 20v-5h5v5" />
  </svg>
);
export const IconSpoon = ({ className = "size-6" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <ellipse cx="15.5" cy="8.5" rx="3.5" ry="4.5" transform="rotate(40 15.5 8.5)" />
    <path d="m12.6 11.4-8.1 8.1" />
  </svg>
);

/** Сота — собственный мотив Дома мёда; используем сдержанно */
export const Hex = ({ className = "size-4", fill = "currentColor", stroke }: P & { fill?: string; stroke?: string }) => (
  <svg viewBox="0 0 20 22" className={className} aria-hidden>
    <path d="M10 1 19 6v10l-9 5-9-5V6z" fill={fill} stroke={stroke} strokeWidth={stroke ? 1.5 : 0} strokeLinejoin="round" />
  </svg>
);
