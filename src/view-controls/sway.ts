// A hand-held drift added to the picture while the view is already moving. It is not part of the view's state.

/** How strong the drift is. `off` is the default. */
export type Sway = "off" | "gentle" | "more";

/** `gentle` or `more`; anything else, including a missing attribute, is `off`. */
export function parseSway(value: string | null): Sway {
  const name = value?.trim().toLowerCase();
  return name === "gentle" || name === "more" ? name : "off";
}

/** How long the drift takes to fade out while the reader has the view, and to fade back in after. */
export const SWAY_FADE_MS = 450;

/** Move `gain` (0 to 1) toward 0 while `held`, and toward 1 otherwise. `elapsedMs` is the time since the last step. */
export function nextSwayGain(gain: number, elapsedMs: number, held: boolean): number {
  if (!(elapsedMs > 0)) return gain;
  const step = Math.min(1, elapsedMs / SWAY_FADE_MS);
  const next = held ? gain * (1 - step) : gain + (1 - gain) * step;
  return next < 0.001 ? 0 : next > 0.999 ? 1 : next;
}

const GENTLE = { yaw: 0.4, tilt: 0.22, roll: 0.16, pan: 2 };

/**
 * The drift at `nowMs`, in degrees and CSS pixels. A few slow waves whose lengths do not line up, so the motion does not visibly repeat.
 * `more` is 2.2 times `gentle`. `off` is nothing.
 */
export function swayOffset(nowMs: number, sway: Sway): { yaw: number; tilt: number; roll: number; panX: number; panY: number } {
  if (sway === "off") return { yaw: 0, tilt: 0, roll: 0, panX: 0, panY: 0 };
  const scale = sway === "more" ? 2.2 : 1;
  const t = nowMs / 1000;
  const wave = (period: number, phase: number): number => Math.sin((t / period) * Math.PI * 2 + phase);
  return {
    yaw: scale * GENTLE.yaw * (0.75 * wave(7.3, 0.4) + 0.25 * wave(12.7, 1.7)),
    tilt: scale * GENTLE.tilt * (0.7 * wave(9.1, 2.2) + 0.3 * wave(15.4, 0.3)),
    roll: scale * GENTLE.roll * wave(11.3, 1.1),
    panX: scale * GENTLE.pan * wave(13.7, 0.8),
    panY: scale * GENTLE.pan * 0.7 * wave(10.2, 2.6),
  };
}
