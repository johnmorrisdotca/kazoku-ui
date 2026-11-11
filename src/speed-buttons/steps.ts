// The speed buttons' arithmetic: pure, so a server or a test can use it. A speed is a plain number (a multiple of the normal pace, or a rate such as days a second);
// the buttons are the steps the page chose, and one of them is on.

/** The steps when a page names none: half speed, normal and double. */
export const DEFAULT_STEPS: readonly number[] = [0.5, 1, 2];

/** The word on each step's button after its number, when the page names none. */
export const DEFAULT_UNIT = "×";

/** The address key the buttons keep their choice under, unless `address-key` names another. */
export const SPEED_ADDRESS_KEY = "speed";

const number = (text: string): number => (text.trim() === "" ? Number.NaN : Number(text));

/** The steps in a list such as `0.5 1 2` or `1, 10, 100`: finite numbers in the order given, each once. `fallback` when the list holds none. A step may be 0 (Paused) or negative (Back). */
export function parseSteps(text: string | null | undefined, fallback: readonly number[] = DEFAULT_STEPS): number[] {
  const found: number[] = [];
  for (const part of (text ?? "").split(/[\s,]+/)) {
    const value = number(part);
    if (Number.isFinite(value) && !found.includes(value)) found.push(value);
  }
  return found.length > 0 ? found : [...fallback];
}

/** The number as a button shows it: `0.5×`, `1×`, `100×`, `−1×` (a real minus sign). At most four significant figures, so 0.333333 reads `0.333×`. */
export function speedText(value: number, unit: string = DEFAULT_UNIT): string {
  const text = String(Number(value.toPrecision(4)));
  return `${text.startsWith("-") ? `−${text.slice(1)}` : text}${unit}`;
}

/** The step nearest `value`: by ratio where both are above zero (so 2.5 is nearer 2 than 4), else by plain distance. `undefined` when there are no steps. */
export function nearestStep(value: number, steps: readonly number[]): number | undefined {
  let best: number | undefined;
  let gap = Number.POSITIVE_INFINITY;
  for (const step of steps) {
    const far = value > 0 && step > 0 ? Math.abs(Math.log(value / step)) : Math.abs(value - step);
    if (far < gap) {
      gap = far;
      best = step;
    }
  }
  return best;
}

/** The step the buttons start on: 1 where the steps have it (normal speed), else the first. */
export function startStep(steps: readonly number[]): number {
  return steps.includes(1) ? 1 : (steps[0] ?? 1);
}

/** The step after (`direction` 1) or before (-1) `value`, going round at the ends: one press of a single button that cycles through the speeds. */
export function stepFrom(value: number, steps: readonly number[], direction: 1 | -1 = 1): number {
  if (steps.length === 0) return value;
  const at = steps.findIndex((step) => step === value);
  const from = at >= 0 ? at : steps.indexOf(nearestStep(value, steps) ?? value);
  return steps[(Math.max(from, 0) + direction + steps.length) % steps.length] as number;
}

/** The number an address or attribute says, not moved to a step. `undefined` when it is not a number at all. The words `slow`, `medium` and `fast` of the first view controls mean 0.5, 1 and 2. */
export function speedValue(text: string | null | undefined): number | undefined {
  if (text === null || text === undefined) return undefined;
  const word = { slow: 0.5, medium: 1, fast: 2 }[text.trim().toLowerCase() as "slow"];
  const value = word ?? number(text);
  return Number.isFinite(value) ? value : undefined;
}

/** What an address or attribute says: a number that is (or is nearest to) one of the steps. `undefined` when it is not a number at all. The words `slow`, `medium` and `fast` of the first view controls mean 0.5, 1 and 2. */
export function parseSpeed(text: string | null | undefined, steps: readonly number[]): number | undefined {
  const value = speedValue(text);
  return value === undefined ? undefined : nearestStep(value, steps);
}
