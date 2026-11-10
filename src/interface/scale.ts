// The scale switch's steps, with no DOM. There are five, always in this order; a view that cannot show one leaves it out and the order of the rest does not change.
import type { InterfaceWords } from "./words.ts";

/** The five steps of scale, from the nearest to the farthest. */
export const SCALE_STEPS = ["surface", "moons", "solar", "stars", "galaxy"] as const;
export type ScaleStep = (typeof SCALE_STEPS)[number];

/** Whether a string is one of the steps. */
export const isScaleStep = (value: string | null | undefined): value is ScaleStep => (SCALE_STEPS as readonly string[]).includes(value ?? "");

/**
 * The steps a view offers, from a list such as `surface solar stars`: only the five names, each once, always in the design's order whatever order the list is in. An empty or missing list is all five.
 * @example
 * parseScaleSteps("stars solar"); // ["solar", "stars"]
 */
export function parseScaleSteps(text: string | null | undefined): ScaleStep[] {
  const wanted = new Set((text ?? "").split(/[\s,]+/));
  const found = SCALE_STEPS.filter((step) => wanted.has(step));
  return found.length > 0 ? found : [...SCALE_STEPS];
}

/** What a step is called, in the words' language. */
export const scaleName = (step: ScaleStep, words: Pick<InterfaceWords, ScaleStep>): string => words[step];
