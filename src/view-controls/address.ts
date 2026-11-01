// The choices kept in the page's address: pure string functions, so a server or a test can use them. Only what a person chose is kept
// (angle, tilt, zoom, what a drag does); the pan is in pixels of one screen and the turning of a moment, so neither is.
import { clamp, DEFAULT_LIMITS, type Limits, wrapYaw } from "./math.ts";

export type DragMode = "move" | "turn";

export interface AddressKeys {
  yaw: string;
  tilt: string;
  zoom: string;
  drag: string;
}

export const DEFAULT_KEYS: AddressKeys = { yaw: "yaw", tilt: "tilt", zoom: "zoom", drag: "drag" };

export interface AddressChoices {
  yaw: number;
  tilt: number;
  zoom: number;
  drag: DragMode;
}

const rounded = (value: number, places: number): number => Number(value.toFixed(places));

/** Read the choices out of a query string (`?yaw=40`, with or without the `?`). Anything missing or not a number is left out of the result. */
export function parseAddress(search: string, keys: AddressKeys = DEFAULT_KEYS, limits: Limits = DEFAULT_LIMITS): Partial<AddressChoices> {
  const params = new URLSearchParams(search);
  const out: Partial<AddressChoices> = {};
  const number = (key: string): number | undefined => {
    const text = params.get(key);
    if (text === null || text.trim() === "") return undefined;
    const value = Number(text);
    return Number.isFinite(value) ? value : undefined;
  };
  const yaw = number(keys.yaw);
  const tilt = number(keys.tilt);
  const zoom = number(keys.zoom);
  if (yaw !== undefined) out.yaw = rounded(wrapYaw(yaw), 0);
  if (tilt !== undefined) out.tilt = rounded(clamp(tilt, -limits.tiltMax, limits.tiltMax), 0);
  if (zoom !== undefined) out.zoom = rounded(clamp(zoom, limits.zoomMin, limits.zoomMax), 2);
  const drag = params.get(keys.drag);
  if (drag === "turn" || drag === "move") out.drag = drag;
  return out;
}

/**
 * The query string (with its `?`, or empty) that keeps `choices` and every other parameter of `search`. A choice at its starting value is left out, so
 * the plain address stays plain. `leaveYaw` keeps the angle out while the view turns by itself (it would change every frame).
 */
export function formatAddress(search: string, choices: AddressChoices, keys: AddressKeys = DEFAULT_KEYS, leaveYaw = false): string {
  const params = new URLSearchParams(search);
  const set = (key: string, value: string | undefined): void => {
    if (value === undefined) params.delete(key);
    else params.set(key, value);
  };
  if (!leaveYaw) set(keys.yaw, Math.round(choices.yaw) === 0 ? undefined : String(rounded(wrapYaw(choices.yaw), 0)));
  set(keys.tilt, Math.round(choices.tilt) === 0 ? undefined : String(rounded(choices.tilt, 0)));
  set(keys.zoom, Math.abs(choices.zoom - 1) < 0.005 ? undefined : String(rounded(choices.zoom, 2)));
  set(keys.drag, choices.drag === "turn" ? "turn" : undefined);
  const text = params.toString();
  return text === "" ? "" : `?${text}`;
}

/** Read `address-keys`: `yaw:a,tilt:b` renames the keys it names and leaves the others. */
export function parseKeys(text: string | null): AddressKeys {
  const keys = { ...DEFAULT_KEYS };
  for (const part of (text ?? "").split(",")) {
    const [name, key] = part.split(":").map((s) => s.trim());
    if (name !== undefined && key !== undefined && key !== "" && name in keys) keys[name as keyof AddressKeys] = key;
  }
  return keys;
}
