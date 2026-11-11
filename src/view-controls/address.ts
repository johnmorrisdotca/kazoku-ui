// The choices kept in the page's address: pure string functions, so a server or a test can use them. Only what a person chose is kept
// (angle, tilt, zoom, the roll and the auto-turn choices); the pan is in pixels of one screen and the turning of a moment, so neither is.
import { type Direction, PACE_FACTOR, parseAxis, parseDirection, parsePace, type TurnAxis } from "./levels.ts";
import { clamp, DEFAULT_LIMITS, type Limits, wrapYaw } from "./math.ts";

export interface AddressKeys {
  yaw: string;
  tilt: string;
  zoom: string;
  /** Not used any more: a plain drag always turns, so there is nothing to keep (0.26.0). `formatAddress` removes an old `drag` from the address. */
  drag?: string;
  /** The auto-turn speed, a number (`0.5`, `2`; 1 is the start and leaves the address). `pace` by default, because a page's own `speed` (a clock's, a replay's) is its own. */
  speed?: string;
  /** Which way Auto-turn goes, `left` or `right`; `direction` by default. */
  direction?: string;
  /** The roll, degrees. `roll` by default. */
  roll?: string;
  /** Which axis Auto-turn drives. `axis` by default. */
  axis?: string;
  /** Which way tilt's auto-turn goes. `tiltDirection` by default. */
  tiltDirection?: string;
  /** Which way roll's auto-turn goes. `rollDirection` by default. */
  rollDirection?: string;
}

export const DEFAULT_KEYS: AddressKeys = { yaw: "yaw", tilt: "tilt", zoom: "zoom", speed: "pace", direction: "direction", roll: "roll", axis: "axis", tiltDirection: "tiltDirection", rollDirection: "rollDirection" };

export interface AddressChoices {
  yaw: number;
  tilt: number;
  zoom: number;
  /** The auto-turn speed as a multiple of the element's `speed`: the number of the button that is on. */
  pace?: number;
  /** The way Auto-turn goes. In `formatAddress`: a way is written; `null` leaves it off the address (it is the page's own start); left out, the key is not touched. */
  direction?: Direction | null;
  roll?: number;
  /** Which axis Auto-turn drives. `angle` is the start and leaves the address. Left out, the key is not touched. */
  axis?: TurnAxis | null;
  /** Tilt's own way. `null` leaves it off the address; left out, the key is not touched. */
  tiltDirection?: Direction | null;
  /** Roll's own way. `null` leaves it off the address; left out, the key is not touched. */
  rollDirection?: Direction | null;
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
  const roll = number(keys.roll ?? "roll");
  if (roll !== undefined) out.roll = rounded(clamp(wrapYaw(roll), -limits.rollMax, limits.rollMax), 0);
  const axis = parseAxis(params.get(keys.axis ?? "axis"));
  if (axis !== undefined) out.axis = axis;
  if (zoom !== undefined) out.zoom = rounded(clamp(zoom, limits.zoomMin, limits.zoomMax), 2);
  const said = params.get(keys.speed ?? "pace");
  // A number is the pace; so are the words of 0.12 and 0.13 (`slow`, `fast`), which a link made then still carries.
  const named = parsePace(said);
  const value = named !== undefined ? PACE_FACTOR[named] : said === null || said.trim() === "" ? Number.NaN : Number(said);
  if (Number.isFinite(value)) out.pace = value;
  const direction = parseDirection(params.get(keys.direction ?? "direction"));
  if (direction !== undefined) out.direction = direction;
  const tiltDirection = parseDirection(params.get(keys.tiltDirection ?? "tiltDirection"));
  if (tiltDirection !== undefined) out.tiltDirection = tiltDirection;
  const rollDirection = parseDirection(params.get(keys.rollDirection ?? "rollDirection"));
  if (rollDirection !== undefined) out.rollDirection = rollDirection;
  return out;
}

/**
 * The query string (with its `?`, or empty) that keeps `choices` and every other parameter of `search`. A choice at its starting value is left out, so
 * the plain address stays plain. `leaveYaw` keeps the angle out while the view turns by itself (it would change every frame). `startZoom` is the zoom the view opens at (1, Fit, unless the page starts elsewhere).
 * `startPace` is the pace the page starts at (1 unless the page sets another): only that pace is left out, so a page that starts at 1440 keeps a chosen 1.
 */
export function formatAddress(search: string, choices: AddressChoices, keys: AddressKeys = DEFAULT_KEYS, leaveYaw = false, startZoom = 1, startPace = 1): string {
  const params = new URLSearchParams(search);
  const set = (key: string, value: string | undefined): void => {
    if (value === undefined) params.delete(key);
    else params.set(key, value);
  };
  if (!leaveYaw) {
    set(keys.yaw, Math.round(choices.yaw) === 0 ? undefined : String(rounded(wrapYaw(choices.yaw), 0)));
    set(keys.tilt, Math.round(choices.tilt) === 0 ? undefined : String(rounded(choices.tilt, 0)));
    if (choices.roll !== undefined) set(keys.roll ?? "roll", Math.round(choices.roll) === 0 ? undefined : String(rounded(wrapYaw(choices.roll), 0)));
  }
  set(keys.zoom, Math.abs(choices.zoom - startZoom) < 0.005 ? undefined : String(rounded(choices.zoom, 2)));
  // An old link may still carry `drag=turn`: it means nothing now, so it leaves the address the next time the address is written.
  set(keys.drag ?? "drag", undefined);
  // The pace key is touched only when the caller has a pace; the page's start pace leaves it off the address.
  const paceKey = keys.speed ?? "pace";
  if (choices.pace !== undefined) set(paceKey, Math.abs(choices.pace - startPace) < 0.0005 ? undefined : String(rounded(choices.pace, 3)));
  if (choices.direction !== undefined) set(keys.direction ?? "direction", choices.direction === null ? undefined : choices.direction);
  if (choices.axis !== undefined) set(keys.axis ?? "axis", choices.axis === null || choices.axis === "angle" ? undefined : choices.axis);
  if (choices.tiltDirection !== undefined) set(keys.tiltDirection ?? "tiltDirection", choices.tiltDirection === null || choices.tiltDirection === "right" ? undefined : choices.tiltDirection);
  if (choices.rollDirection !== undefined) set(keys.rollDirection ?? "rollDirection", choices.rollDirection === null || choices.rollDirection === "right" ? undefined : choices.rollDirection);
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
