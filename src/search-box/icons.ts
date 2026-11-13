// The icons a search row's action can wear: a few path strings on a 24 by 24 grid, drawn stroked (a toggle's star fills when it is on), the same look as the family's other icons.
// A page's own icon is path data only, checked here before it is drawn; the box builds the SVG node by node, never from a string of markup, so nothing a page passes can add an element or an attribute.

/** The names of the built-in icons. `eye` and `arrow` are other names for `show` and `go`. */
export const SEARCH_ICON_NAMES = ["star", "show", "go", "dot", "eye", "arrow"] as const;
export type SearchIconName = (typeof SEARCH_ICON_NAMES)[number];

/** A page's own icon: SVG path data (`d`) on a 24 by 24 grid, one string or several. Stroked, so draw it as lines; a toggle that is on fills it. */
export interface SearchIconPath {
  path: string | readonly string[];
}

/** What an action's `icon` can be. */
export type SearchIcon = SearchIconName | SearchIconPath;

/** The paths of each built-in icon, on the 24 grid. */
export const SEARCH_ICONS: Readonly<Record<"star" | "show" | "go" | "dot", readonly string[]>> = {
  star: ["M12 3.6l2.6 5.4 5.9.8-4.3 4.2 1 5.9L12 17l-5.2 2.9 1-5.9L3.5 9.8l5.9-.8z"],
  show: ["M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z", "M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z"],
  go: ["M4.5 12h14", "M13 6.5l5.5 5.5-5.5 5.5"],
  dot: ["M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z"],
};

/** The most characters of path data a page's own icon may have (one string). */
export const MAX_ICON_PATH = 800;

const SAFE_PATH = /^[MmLlHhVvCcSsQqTtAaZz0-9eE.,+\-\s]+$/;

/**
 * Whether a string is path data this box will draw: only the path commands, numbers, signs, commas and spaces, and not longer than `MAX_ICON_PATH`.
 *
 * @example
 * isSafePath("M4 12h16"); // true
 * isSafePath("M0 0h1\" onload=\"x"); // false
 */
export const isSafePath = (d: string): boolean => d.length > 0 && d.length <= MAX_ICON_PATH && SAFE_PATH.test(d);

/**
 * The path data to draw for an action's `icon`, or `undefined` when it has none (the action is then a text button). A built-in name gives its paths; an unknown name, or a page's own
 * path that is not safe path data, gives the dot, so a typo is seen and nothing unsafe is drawn.
 *
 * @example
 * iconPaths("go"); // ["M4.5 12h14", "M13 6.5l5.5 5.5-5.5 5.5"]
 * iconPaths({ path: "M4 12h16" }); // ["M4 12h16"]
 * iconPaths(undefined); // undefined
 */
export function iconPaths(icon: SearchIcon | undefined): readonly string[] | undefined {
  if (icon === undefined || icon === null) return undefined;
  if (typeof icon === "string") {
    const name = icon === "eye" ? "show" : icon === "arrow" ? "go" : icon;
    return name in SEARCH_ICONS ? SEARCH_ICONS[name as keyof typeof SEARCH_ICONS] : SEARCH_ICONS.dot;
  }
  const own = (Array.isArray(icon.path) ? icon.path : [icon.path]).filter((d): d is string => typeof d === "string");
  return own.length > 0 && own.length <= 6 && own.every(isSafePath) ? own : SEARCH_ICONS.dot;
}
