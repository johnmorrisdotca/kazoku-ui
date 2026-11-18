// What the box keeps about the rows it has drawn, and the numbers it draws by. Moved out of element.ts as it was; nothing here touches the DOM beyond the types.
import type { PlanLine, SearchAction } from "./model.ts";

/** The rows the keyboard can stand on, in order. */
export type NavLine = Exclude<PlanLine, { type: "header" }>;

export interface NavEntry {
  line: NavLine;
  el: HTMLElement;
  actions: SearchAction[];
  buttons: HTMLButtonElement[];
  /** The row's own text cell, which stands for its first action, then one cell for each action (on a narrow screen the last is the Details action, which opens the preview). */
  main: HTMLElement;
  cells: HTMLElement[];
  /** The button that holds the actions that do not fit, and how many actions are drawn on the row's line (all of them unless the row is narrow). */
  more?: HTMLButtonElement;
  shown: number;
}

export type Mode = "idle" | "busy" | "answer" | "failed";

export const DEFAULT_DEBOUNCE = 120;
export const DEFAULT_PER_GROUP = 3;
export const DEFAULT_WINDOW = 20;
/** The least width a row keeps for its name before actions go behind "more". */
export const MIN_NAME_WIDTH = 96;
/** How close to the end of the drawn rows (in px) the next window is drawn, and how near (in rows) the highlight may come to the end before it is. */
export const NEAR_END = 160;
export const NEAR_ROWS = 4;

export const whole = (value: string | null, fallback: number, min = 0): number => {
  const n = Number(value);
  return value !== null && value.trim() !== "" && Number.isInteger(n) && n >= min ? n : fallback;
};
