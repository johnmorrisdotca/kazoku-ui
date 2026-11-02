// The theme choice without the element: the three choices, what each means, and how a choice is applied to a page. Nothing here touches the DOM until a function is called with an element.

export const THEMES = ["light", "dark", "auto"] as const;
export type Theme = (typeof THEMES)[number];
export type Scheme = "light" | "dark";

/** The attribute the choice is written to on the target. `auto` removes it, so the page's own `prefers-color-scheme` rules decide. */
export const THEME_ATTRIBUTE = "data-theme";
/** The address parameter, with `address`. */
export const THEME_ADDRESS_KEY = "theme";
/** The localStorage key, with a bare `storage`. */
export const THEME_STORAGE_KEY = "kazoku-theme";

export const parseTheme = (value: unknown): Theme | undefined => (THEMES as readonly unknown[]).includes(value) ? (value as Theme) : undefined;

/** The colours a choice gives: light and dark are themselves, auto is the device's. */
export const resolveTheme = (choice: Theme, prefersDark: boolean): Scheme => (choice === "auto" ? (prefersDark ? "dark" : "light") : choice);

/** The choices a switch offers, from `modes="light dark"`: the known ones, once each, in the order light, dark, auto. Nothing usable gives all three. */
export function parseModes(value: string | null | undefined): Theme[] {
  const named = new Set((value ?? "").split(/[\s,]+/).map((word) => parseTheme(word.toLowerCase())));
  const kept = THEMES.filter((theme) => named.has(theme));
  return kept.length > 0 ? kept : [...THEMES];
}

/** What a target holds now: `light` or `dark` when forced, `auto` when it says nothing or something else. */
export const themeOf = (target: Element): Theme => parseTheme(target.getAttribute(THEME_ATTRIBUTE)) ?? "auto";

/** Writes the choice on the target (`data-theme="light"`, `"dark"`, or no attribute for auto). */
export function applyTheme(target: Element, choice: Theme): void {
  if (choice === "auto") target.removeAttribute(THEME_ATTRIBUTE);
  else target.setAttribute(THEME_ATTRIBUTE, choice);
}

/** Where a remembered choice may be read from. A page that keeps nothing passes neither. */
export interface RememberedTheme {
  /** An address' search string such as `?theme=dark`, read with `addressKey`. */
  search?: string;
  addressKey?: string;
  /** A localStorage-like object and the key in it. A store that throws is the same as an empty one. */
  storage?: Pick<Storage, "getItem">;
  storageKey?: string;
}

/** The remembered choice: the address first, then the store. `undefined` when neither holds a valid one. */
export function readTheme(from: RememberedTheme): Theme | undefined {
  if (from.search !== undefined) {
    const asked = parseTheme(new URLSearchParams(from.search).get(from.addressKey ?? THEME_ADDRESS_KEY));
    if (asked !== undefined) return asked;
  }
  if (from.storage !== undefined) {
    try {
      return parseTheme(from.storage.getItem(from.storageKey ?? THEME_STORAGE_KEY));
    } catch {
      /* a browser that keeps nothing */
    }
  }
  return undefined;
}
