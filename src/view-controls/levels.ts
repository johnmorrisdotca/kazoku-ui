// The controls' two levels and the auto-turn pace: pure, so a server or a test can use them.

/** `basic` is the default: turn, zoom with its readout, Fit and Auto-turn, and the speed while it turns. `advanced` adds tilt, the three speeds, Front and the pan pad. */
export type Level = "basic" | "advanced";

export const parseLevel = (text: string | null | undefined): Level | undefined => (text === "basic" || text === "advanced" ? text : undefined);

/** The localStorage key the level is remembered under, unless `storage` names another. */
export const LEVEL_STORAGE_KEY = "kazoku-view-controls";

/** The three speeds of 0.12 and 0.13 by name: Medium is the element's `speed`, Slow half of it and Fast twice it. A pace is now any number (the `pace` attribute, the `paces` it chooses from); these words still read as 0.5, 1 and 2. */
export type Pace = "slow" | "medium" | "fast";

export const PACES: readonly Pace[] = ["slow", "medium", "fast"];

export const PACE_FACTOR: Record<Pace, number> = { slow: 0.5, medium: 1, fast: 2 };

export const parsePace = (text: string | null | undefined): Pace | undefined => PACES.find((pace) => pace === text);

/** Which way Auto-turn goes. By the drag rule `yaw` goes up as the hand goes right, so `right` is a positive speed and `left` a negative one; the page's drawing decides what that looks like. */
export type Direction = "left" | "right";

export const parseDirection = (text: string | null | undefined): Direction | undefined => (text === "left" || text === "right" ? text : undefined);

/** Which axis Auto-turn drives. `angle` is yaw, the default. `all` is a tumble on yaw, tilt and roll at once. */
export type TurnAxis = "angle" | "tilt" | "roll" | "all";

export const parseAxis = (text: string | null | undefined): TurnAxis | undefined => (text === "angle" || text === "tilt" || text === "roll" || text === "all" ? text : undefined);

/** The zoom as the readout shows it: `1×`, `2.4×`; below 1, two figures, so a small zoom never reads `0×`. */
export const zoomText = (zoom: number): string => `${Number(zoom < 1 ? zoom.toPrecision(2) : zoom.toFixed(1))}×`;

/**
 * How the controls are laid out, the `layout` attribute. `classic` is the default: the bar of 0.10 and before, unchanged. `horizontal` is a tidy bar under the view with the
 * zoom slider; `vertical` a column beside the view; `compact` one short row for a card or a phone, with everything else one press of More away. The level (`controls`) still
 * says what is shown; the layout says where.
 */
export type Layout = "classic" | "horizontal" | "vertical" | "compact";

export const LAYOUTS: readonly Layout[] = ["classic", "horizontal", "vertical", "compact"];

/** A layout is one of its words; anything else (or none) is `classic`. */
export const parseLayout = (text: string | null | undefined): Layout => LAYOUTS.find((layout) => layout === text) ?? "classic";
