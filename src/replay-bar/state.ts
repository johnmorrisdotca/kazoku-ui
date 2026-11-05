// The replay bar's own choices, with no DOM, so a server can read an address the same way the element does.

/** The address key for playing, unless `address-keys` names another. */
export const PLAY_KEY = "play";
/** The address key for the repeat loop, unless `address-keys` names another. */
export const REPEAT_KEY = "repeat";
/** The address key the bar's speed buttons use, so they do not share a view's `pace`. */
export const SPEED_KEY = "replay-speed";
/** A replay's usual speeds. A page sets its own with `steps`. */
export const DEFAULT_STEPS = "0.25 0.5 1 2 4";

/** Whether an address or attribute value means on. Anything else, including nothing, is off. */
export function flagOn(value: string | null | undefined): boolean {
  return value === "on" || value === "true" || value === "1";
}

/**
 * The address keys for play and repeat. `play:p,repeat:r` renames either; an unknown name is ignored.
 * @param spec The `address-keys` attribute.
 * @returns The key for each choice.
 */
export function addressKeys(spec: string | null | undefined): { play: string; repeat: string } {
  const out = { play: PLAY_KEY, repeat: REPEAT_KEY };
  for (const part of (spec ?? "").split(",")) {
    const [name, key] = part.split(":").map((piece) => piece.trim());
    if ((name === "play" || name === "repeat") && key) out[name] = key;
  }
  return out;
}
