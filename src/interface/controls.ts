// The control bar's parts and their order, with no DOM. The same on every view; a view that cannot do one leaves it out and the order of the rest does not change.
import type { InterfaceWords } from "./words.ts";

/** The controls in the design's order: slower, play or pause, faster, the clock, back to now, a divider, your place, layers, look, free flight. */
export const CONTROL_ORDER = ["slower", "play", "faster", "clock", "now", "place", "layers", "look", "flight"] as const;
export type ControlName = (typeof CONTROL_ORDER)[number];

/** The controls on the near side of the divider, and on the far side of it. */
export const TIME_CONTROLS: readonly ControlName[] = ["slower", "play", "faster", "clock", "now"];
export const VIEW_CONTROLS: readonly ControlName[] = ["place", "layers", "look", "flight"];

/**
 * The controls a view offers, from a list such as `play clock layers`: only the nine names, each once, always in the design's order. A missing list is all nine.
 * @example
 * parseControls("layers play clock"); // ["play", "clock", "layers"]
 */
export function parseControls(text: string | null | undefined): ControlName[] {
  if (text === null || text === undefined || text.trim() === "") return [...CONTROL_ORDER];
  const wanted = new Set(text.split(/[\s,]+/));
  return CONTROL_ORDER.filter((name) => wanted.has(name));
}

/** The ways a view can be drawn, which the Look button goes through: lines, realistic, painted. */
export const LOOKS = ["line", "realistic", "painted"] as const;
export type Look = (typeof LOOKS)[number];

/** The looks a view offers, from a list such as `realistic painted`, in the design's order; all three when it is empty. */
export function parseLooks(text: string | null | undefined): Look[] {
  const wanted = new Set((text ?? "").split(/[\s,]+/));
  const found = LOOKS.filter((look) => wanted.has(look));
  return found.length > 0 ? found : [...LOOKS];
}

/** The look after `current` in `looks`, going round. */
export function nextLook(current: string | null | undefined, looks: readonly Look[] = LOOKS): Look {
  const at = looks.indexOf(current as Look);
  return looks[(at + 1) % looks.length] as Look;
}

/** The look's name in the words' language. */
export const lookName = (look: Look, words: Pick<InterfaceWords, "lookLine" | "lookRealistic" | "lookPainted">): string => ({ line: words.lookLine, realistic: words.lookRealistic, painted: words.lookPainted })[look];
