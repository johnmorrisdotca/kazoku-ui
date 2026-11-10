// The icons the parts draw: each is a few path strings on a 24 by 24 grid, stroked (never filled) at 1.75 with round caps and joins, so one stroke width and one look serve every part.
// A page can hand an icon button its own `<svg>` as the button's content instead; these are the ones the control bar and the top bar need.

/** The names of the built-in icons. */
export const ICON_NAMES = ["slower", "play", "pause", "faster", "now", "place", "layers", "look", "flight", "close", "search", "menu"] as const;
export type IconName = (typeof ICON_NAMES)[number];

/** The stroke width of every icon, in the 24-unit grid. */
export const ICON_STROKE = 1.75;

/** The path data of each icon. */
export const ICONS: Readonly<Record<IconName, readonly string[]>> = {
  slower: ["M11 6l-6 6 6 6", "M19 6l-6 6 6 6"],
  play: ["M8 5v14l11-7z"],
  pause: ["M9 5v14", "M15 5v14"],
  faster: ["M13 6l6 6-6 6", "M5 6l6 6-6 6"],
  now: ["M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z", "M12 3v3.5", "M12 17.5V21", "M3 12h3.5", "M17.5 12H21"],
  place: ["M12 21s-6.5-5.6-6.5-10.5a6.5 6.5 0 1 1 13 0C18.5 15.4 12 21 12 21z", "M12 8.2a2.3 2.3 0 1 0 0 4.6 2.3 2.3 0 0 0 0-4.6z"],
  layers: ["M12 3l9 5-9 5-9-5z", "M3 12.5l9 5 9-5", "M3 16.5l9 5 9-5"],
  look: ["M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z", "M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z"],
  flight: ["M21 3L3 10.5l7 3 3 7z", "M10 13.5L21 3"],
  close: ["M6 6l12 12", "M18 6L6 18"],
  search: ["M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z", "M20 20l-4-4"],
  menu: ["M4 7h16", "M4 12h16", "M4 17h16"],
};

/** An icon as SVG markup, for a page written as plain HTML: `iconSvg("play")`. It is hidden from a screen reader; the button carries the name. */
export function iconSvg(name: IconName): string {
  const paths = ICONS[name].map((d) => `<path d="${d}"/>`).join("");
  return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="${ICON_STROKE}" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}

/** Whether a string is the name of a built-in icon. */
export const isIconName = (name: string | null | undefined): name is IconName => (ICON_NAMES as readonly string[]).includes(name ?? "");
