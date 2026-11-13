// The icons a search row's action can wear: a few path strings on a 24 by 24 grid, drawn stroked (a toggle's star fills when it is on), the same look as the family's other icons.
// A page's own icon is path data only, checked here before it is drawn; the box builds the SVG node by node, never from a string of markup, so nothing a page passes can add an element or an attribute.

/** The names of the built-in action icons. `eye` and `arrow` are other names for `show` and `go`; `info` is the one the box draws for the preview on a narrow screen. */
export const SEARCH_ICON_NAMES = ["star", "show", "go", "dot", "eye", "arrow", "info"] as const;
export type SearchIconName = (typeof SEARCH_ICON_NAMES)[number];

/** A page's own icon: SVG path data (`d`) on a 24 by 24 grid, one string or several. Stroked, so draw it as lines; a toggle that is on fills it. */
export interface SearchIconPath {
  path: string | readonly string[];
}

/** What an action's `icon` can be. */
export type SearchIcon = SearchIconName | SearchIconPath;

/** The paths of each built-in icon, on the 24 grid. */
export const SEARCH_ICONS: Readonly<Record<"star" | "show" | "go" | "dot" | "info", readonly string[]>> = {
  star: ["M12 3.6l2.6 5.4 5.9.8-4.3 4.2 1 5.9L12 17l-5.2 2.9 1-5.9L3.5 9.8l5.9-.8z"],
  show: ["M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z", "M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z"],
  go: ["M4.5 12h14", "M13 6.5l5.5 5.5-5.5 5.5"],
  dot: ["M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z"],
  info: ["M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z", "M12 11v5.5", "M12 7.7h.01"],
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
    return Object.hasOwn(SEARCH_ICONS, name) ? SEARCH_ICONS[name as keyof typeof SEARCH_ICONS] : SEARCH_ICONS.dot;
  }
  const own = (Array.isArray(icon.path) ? icon.path : [icon.path]).filter((d): d is string => typeof d === "string");
  return own.length > 0 && own.length <= 6 && own.every(isSafePath) ? own : SEARCH_ICONS.dot;
}

/**
 * The names of the built-in icons a result row can wear in the list: `disc` and `star` and `dot` and `square` are filled, `ring` is an outline.
 *
 * @example
 * ROW_ICON_NAMES.includes("disc"); // true
 */
export const ROW_ICON_NAMES = ["disc", "ring", "star", "dot", "square"] as const;
export type RowIconName = (typeof ROW_ICON_NAMES)[number];

/** A built-in row icon with a colour: `{ name: "disc", color: "#c1440e" }`. */
export interface RowIconNamed {
  name: RowIconName;
  /** A CSS colour: `#rgb`, `#rrggbb`, a colour name, or `rgb()`, `hsl()`, `oklch()` and the like. Anything else is ignored and the row's text colour is used. */
  color?: string;
}

/** A row icon the page draws as path data on a 24 by 24 grid, stroked, or filled when `filled` is true. */
export interface RowIconShape {
  path: string | readonly string[];
  color?: string;
  filled?: boolean;
}

/** A row icon that is a few characters: a flag, a letter, a symbol. */
export interface RowIconText {
  text: string;
  color?: string;
}

/** A row icon that is a small picture: an address the page serves. */
export interface RowIconImage {
  src: string;
}

/** What a result row's `icon` can be, drawn at 20 px before its name. */
export type RowIcon = RowIconName | RowIconNamed | RowIconShape | RowIconText | RowIconImage;

/** A row icon after checking, ready to draw. */
export type RowIconSpec =
  | { type: "shape"; paths: readonly string[]; filled: boolean; color?: string }
  | { type: "text"; text: string; color?: string }
  | { type: "image"; src: string };

/**
 * The most characters a text icon may have (a flag is two).
 *
 * @example
 * [...(rowIconSpec({ text: "x".repeat(50) }) as { text: string }).text].length; // MAX_ICON_TEXT (8)
 */
export const MAX_ICON_TEXT = 8;

const BUILT_IN_ROW: Readonly<Record<RowIconName, { paths: readonly string[]; filled: boolean }>> = {
  disc: { paths: ["M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z"], filled: true },
  ring: { paths: ["M12 4.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15z"], filled: false },
  star: { paths: SEARCH_ICONS.star, filled: true },
  dot: { paths: SEARCH_ICONS.dot, filled: true },
  square: { paths: ["M5.5 5.5h13v13h-13z"], filled: true },
};

const SAFE_COLOR = /^(#[0-9a-f]{3,8}|[a-z]{3,24}|(rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch)\([0-9a-z\s.,%/+-]{1,80}\))$/i;

/**
 * Whether a string is a colour this box will set: a hex colour, a colour name, or `rgb()`, `hsl()`, `hwb()`, `lab()`, `lch()`, `oklab()` or `oklch()` with plain numbers. A `var()`, a `url()` and anything with a semicolon or a brace is refused.
 *
 * @example
 * isSafeColor("#c1440e"); // true
 * isSafeColor("oklch(70% 0.1 40)"); // true
 * isSafeColor("red; background: url(x)"); // false
 */
export const isSafeColor = (color: string): boolean => color.length <= 100 && SAFE_COLOR.test(color.trim());

/**
 * Whether an address is one this box will load as a row's or a preview's picture: a relative address, `https:`, `http:`, or a `data:` PNG, JPEG, WebP, GIF or AVIF. Never `javascript:`, never another scheme, and not longer than 2000 characters.
 *
 * @example
 * isSafeImageUrl("/pictures/mars.webp"); // true
 * isSafeImageUrl("javascript:alert(1)"); // false
 */
export function isSafeImageUrl(src: string): boolean {
  if (typeof src !== "string" || src.length === 0 || src.length > 2000 || /\s/.test(src) || [...src].some((char) => char.charCodeAt(0) < 32)) return false;
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(src)?.[1]?.toLowerCase();
  if (scheme === undefined) return true;
  if (scheme === "https" || scheme === "http") return true;
  return scheme === "data" && /^data:image\/(png|jpeg|webp|gif|avif);base64,[a-z0-9+/=]+$/i.test(src);
}

/**
 * What to draw for a row's `icon`, or `undefined` when it has none or is nothing to draw. A built-in name draws its shape (an unknown name is the dot); path data is checked as an action's icon is;
 * text is trimmed and kept to `MAX_ICON_TEXT` characters; an address must pass `isSafeImageUrl`; a colour that is not `isSafeColor` is dropped, so the row's text colour is used.
 *
 * @example
 * rowIconSpec({ name: "disc", color: "#c1440e" }); // { type: "shape", paths: [...], filled: true, color: "#c1440e" }
 * rowIconSpec({ text: "🇯🇵" }); // { type: "text", text: "🇯🇵" }
 * rowIconSpec({ src: "javascript:alert(1)" }); // undefined
 */
export function rowIconSpec(icon: RowIcon | undefined | null): RowIconSpec | undefined {
  if (icon === undefined || icon === null) return undefined;
  const color = (value: unknown): { color?: string } => (typeof value === "string" && isSafeColor(value) ? { color: value.trim() } : {});
  if (typeof icon === "string") {
    const built = Object.hasOwn(BUILT_IN_ROW, icon) ? BUILT_IN_ROW[icon] : BUILT_IN_ROW.dot;
    return { type: "shape", paths: built.paths, filled: built.filled };
  }
  if (typeof icon !== "object") return undefined;
  if ("name" in icon) {
    const built = Object.hasOwn(BUILT_IN_ROW, icon.name) ? BUILT_IN_ROW[icon.name] : BUILT_IN_ROW.dot;
    return { type: "shape", paths: built.paths, filled: built.filled, ...color(icon.color) };
  }
  if ("path" in icon) {
    const own = (Array.isArray(icon.path) ? icon.path : [icon.path]).filter((d): d is string => typeof d === "string");
    // path data that is not safe is the dot, as it is for an action
    if (!(own.length > 0 && own.length <= 6 && own.every(isSafePath))) return { type: "shape", paths: BUILT_IN_ROW.dot.paths, filled: true, ...color(icon.color) };
    return { type: "shape", paths: own, filled: icon.filled === true, ...color(icon.color) };
  }
  if ("text" in icon) {
    const text = typeof icon.text === "string" ? [...icon.text.trim()].slice(0, MAX_ICON_TEXT).join("") : "";
    return text === "" ? undefined : { type: "text", text, ...color(icon.color) };
  }
  if ("src" in icon) return typeof icon.src === "string" && isSafeImageUrl(icon.src) ? { type: "image", src: icon.src } : undefined;
  return undefined;
}
