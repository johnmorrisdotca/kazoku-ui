// The wide layout (theatre mode) without the element: the choice, how it is applied to a page, where it is remembered, and the CSS rule that moves the side panel below the view. Nothing here touches the DOM until a function is called with an element.

/** The attribute the choice is written to on the target: `data-wide="on"` when wide, none when normal. */
export const WIDE_ATTRIBUTE = "data-wide";
/** The address parameter, with `address`: `?wide=on`. */
export const WIDE_ADDRESS_KEY = "wide";
/** The localStorage key, with a bare `storage`. */
export const WIDE_STORAGE_KEY = "kazoku-wide";
/** Below this width the layout is already one column, so the toggle hides and the rule does nothing. */
export const WIDE_MIN_WIDTH_PX = 641;

/** `on`, `1`, `true` and `wide` are wide; `off`, `0`, `false` and `normal` are not; anything else is no answer. */
export function parseWide(value: unknown): boolean | undefined {
  if (typeof value !== "string") return undefined;
  const word = value.trim().toLowerCase();
  if (["on", "1", "true", "wide"].includes(word)) return true;
  if (["off", "0", "false", "normal"].includes(word)) return false;
  return undefined;
}

/** What a target holds now. */
export const wideOf = (target: Element): boolean => target.getAttribute(WIDE_ATTRIBUTE) === "on";

/** Writes the choice on the target. */
export function applyWide(target: Element, wide: boolean): void {
  if (wide) target.setAttribute(WIDE_ATTRIBUTE, "on");
  else target.removeAttribute(WIDE_ATTRIBUTE);
}

/** Where a remembered choice may be read from. A page that keeps nothing passes neither. */
export interface RememberedWide {
  /** An address' search string such as `?wide=on`, read with `addressKey`. */
  search?: string;
  addressKey?: string;
  /** A localStorage-like object and the key in it. A store that throws is the same as an empty one. */
  storage?: Pick<Storage, "getItem">;
  storageKey?: string;
}

/** The remembered choice: the address first, then the store. `undefined` when neither holds one. */
export function readWide(from: RememberedWide): boolean | undefined {
  if (from.search !== undefined) {
    const asked = parseWide(new URLSearchParams(from.search).get(from.addressKey ?? WIDE_ADDRESS_KEY));
    if (asked !== undefined) return asked;
  }
  if (from.storage !== undefined) {
    try {
      return parseWide(from.storage.getItem(from.storageKey ?? WIDE_STORAGE_KEY));
    } catch {
      /* a browser that keeps nothing */
    }
  }
  return undefined;
}

/** Whether a key press is the reader typing: a text field, a select, an editable element, or any key with Ctrl, Command or Alt held. The T key is left to them. */
export function isTyping(target: Element | null, event: { ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean }): boolean {
  if (event.ctrlKey === true || event.metaKey === true || event.altKey === true) return true;
  if (target === null || typeof target.closest !== "function") return false;
  return target.closest("input, textarea, select, [contenteditable]:not([contenteditable='false'])") !== null;
}

export interface WideCssOptions {
  /** The width of the side panel beside the view in Normal. 320px by default. */
  side?: string;
  /** The tallest the view gets in Wide, with its 16:9 shape kept. 80vh by default. */
  maxHeight?: string;
}

/**
 * The layout rule, as CSS for the page. A `.kazoku-stage` holds a `.kazoku-view` and a `.kazoku-side`. In Normal the panel is a column beside the view. When an ancestor (the page's <html> by
 * default) has `data-wide="on"` the stage is one column: the view takes the full width, 16:9 and no taller than `maxHeight`, and the panel moves below it as a row that wraps into a grid. On a
 * phone the stage is always one column. The page's own container must not cap its width in Wide (`[data-wide="on"] main { max-width: none }`).
 */
export function wideCss(options: WideCssOptions = {}): string {
  const side = options.side ?? "320px";
  const max = options.maxHeight ?? "80vh";
  return `.kazoku-stage { display: grid; grid-template-columns: minmax(0, 1fr) ${side}; gap: 12px; align-items: start; }
.kazoku-stage > .kazoku-view, .kazoku-stage > .kazoku-side { min-width: 0; }
@media (max-width: ${WIDE_MIN_WIDTH_PX - 1}px) { .kazoku-stage { grid-template-columns: minmax(0, 1fr); } }
@media (min-width: ${WIDE_MIN_WIDTH_PX}px) {
  [${WIDE_ATTRIBUTE}="on"] .kazoku-stage { grid-template-columns: minmax(0, 1fr); }
  [${WIDE_ATTRIBUTE}="on"] .kazoku-stage > .kazoku-view { height: auto; aspect-ratio: 16 / 9; max-height: ${max}; }
  [${WIDE_ATTRIBUTE}="on"] .kazoku-stage > .kazoku-side { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr)); gap: 12px; align-items: start; }
}
`;
}
