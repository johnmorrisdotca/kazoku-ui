// The controls' two levels and the auto-turn pace: pure, so a server or a test can use them.

/** `basic` is the default: turn, zoom with its readout, Fit and Auto-turn, and the speed while it turns. `advanced` adds tilt, the three speeds, Front and the pan pad. */
export type Level = "basic" | "advanced";

export const parseLevel = (text: string | null | undefined): Level | undefined => (text === "basic" || text === "advanced" ? text : undefined);

/** The localStorage key the level is remembered under, unless `storage` names another. */
export const LEVEL_STORAGE_KEY = "kazoku-view-controls";

/** Auto-turn speed: Medium is the element's `speed`, Slow half of it and Fast twice it. */
export type Pace = "slow" | "medium" | "fast";

export const PACES: readonly Pace[] = ["slow", "medium", "fast"];

export const PACE_FACTOR: Record<Pace, number> = { slow: 0.5, medium: 1, fast: 2 };

export const parsePace = (text: string | null | undefined): Pace | undefined => PACES.find((pace) => pace === text);

/** The zoom as the readout shows it: `1×`, `2.4×`; below 1, two figures, so a small zoom never reads `0×`. */
export const zoomText = (zoom: number): string => `${Number(zoom < 1 ? zoom.toPrecision(2) : zoom.toFixed(1))}×`;
