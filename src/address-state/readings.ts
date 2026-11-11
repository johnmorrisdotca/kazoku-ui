// The family's one spelling for the readings switch (ふりがな, furigana: small kana readings beside kanji): `?readings=on` in the address, `kazoku-readings` on the device.
// Each package draws its own switch with its display options (not in the view controls) and shows it only where there is kanji to read; this is the choice it keeps.
import { localStore, remember } from "../shared/store.ts";

/** The address key: `?readings=on` turns the readings on. */
export const READINGS_KEY = "readings";
/** The value the address is given when the readings are on. Off is no key at all. */
export const READINGS_ON = "on";
/** The localStorage key for a reader's own press of the switch. */
export const READINGS_STORAGE_KEY = "kazoku-readings";

/** Whether an address value means on: the key is there with any value but `off`, `0` or `false` (`?readings`, `?readings=on`). No key is `undefined`. */
export function parseReadings(value: string | null | undefined): boolean | undefined {
  if (value === null || value === undefined) return undefined;
  return !["off", "0", "false"].includes(value.trim().toLowerCase());
}

/** Where a choice may be read from. A page that keeps nothing passes neither. */
export interface RememberedReadings {
  /** An address' search string such as `?readings=on`. */
  search?: string;
  /** A localStorage-like object. A store that throws is the same as an empty one. */
  storage?: Pick<Storage, "getItem">;
}

/** Whether the readings start on: the address first, then a press kept on the device, else off. */
export function readReadings(from: RememberedReadings = {}): boolean {
  if (from.search !== undefined) {
    const asked = parseReadings(new URLSearchParams(from.search).get(READINGS_KEY));
    if (asked !== undefined) return asked;
  }
  if (from.storage !== undefined) {
    try {
      const kept = from.storage.getItem(READINGS_STORAGE_KEY);
      if (kept === READINGS_ON) return true;
    } catch {
      /* a browser that keeps nothing */
    }
  }
  return false;
}

/** The address change for a choice, for `applyParams` or an address state's `setMany`: `{ readings: "on" }`, or `{ readings: null }` to take it off. */
export function readingsParams(on: boolean): { [READINGS_KEY]: string | null } {
  return { [READINGS_KEY]: on ? READINGS_ON : null };
}

/** Keeps a reader's press of the switch on the device (`on` or `off`), so their next visit starts the same. Only a press is kept, never a link's choice. */
export function keepReadings(on: boolean): void {
  remember(READINGS_STORAGE_KEY, on ? READINGS_ON : "off");
}

/** The kept choice from this browser's localStorage, for `readReadings({ search, storage: readingsStorage() })`. */
export const readingsStorage = (): Storage | undefined => localStore();
