/// <reference types="node" />
import { readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { lockDir } from "./queue.ts";

/**
 * What a browser run asks for. A `native` run uses the machine's own browser (timing tests need the machine to themselves, so there is one native slot unless the
 * machine says more). An `image` run is a container of Microsoft's Playwright image with its CPUs and memory fenced, so several can run at once without slowing each
 * other; the machine's `browser-slots.json` says how many.
 */
export type BrowserSlotKind = "native" | "image";

/** How many slots of each kind a machine has. */
export interface BrowserSlots {
  /** Browser runs on the machine itself at once. At least 1; the default is 1. */
  native: number;
  /** Runs in the CI image at once. The default is 0: a machine that has not been set up runs none, and nothing about it changes. */
  image: number;
}

/** One slot's lock file. */
export interface BrowserSlot {
  kind: BrowserSlotKind;
  /** 0 for the first slot of a kind. */
  index: number;
  file: string;
}

/** The most slots of one kind that are looked at. A typo like 4000 must not make the status write a thousand lines. */
const MOST_SLOTS = 64;

/** Where the machine says how many slots it has: `KAZOKU_BROWSER_SLOTS_FILE`, else `~/.config/kazoku-ui/browser-slots.json`. */
export const slotsFile = (): string => process.env.KAZOKU_BROWSER_SLOTS_FILE || join(homedir(), ".config", "kazoku-ui", "browser-slots.json");

const count = (value: unknown, fallback: number, least: number): number => (typeof value === "number" && Number.isFinite(value) ? Math.min(MOST_SLOTS, Math.max(least, Math.floor(value))) : fallback);

/**
 * The slots this machine has, from `~/.config/kazoku-ui/browser-slots.json` (`{ "native": 1, "image": 4 }`). A missing or unreadable file, or a key that is not a number,
 * gives the defaults: one native slot and no image slots. Native is never less than 1.
 *
 * @example
 * const { native, image } = browserSlots();
 * console.log(`${native} native, ${image} in the CI image`);
 */
export function browserSlots(): BrowserSlots {
  try {
    const parsed = JSON.parse(readFileSync(slotsFile(), "utf8")) as Partial<Record<keyof BrowserSlots, unknown>>;
    return { native: count(parsed.native, 1, 1), image: count(parsed.image, 0, 0) };
  } catch {
    return { native: 1, image: 0 };
  }
}

/** The lock file of one slot. The first native slot is `browser.lock`, as it always was, so a run on older code still shares it. */
export function slotFile(kind: BrowserSlotKind, index: number): string {
  if (kind === "native" && index === 0) return join(lockDir(), "browser.lock");
  return join(lockDir(), `browser.${kind}-${index + 1}.lock`);
}

/**
 * Every slot to look at for one kind: the machine's own count, and any further slot file still on disk (a slot a holder keeps after the count was lowered).
 */
export function slotsOf(kind: BrowserSlotKind, slots: BrowserSlots = browserSlots()): BrowserSlot[] {
  let most = slots[kind];
  try {
    for (const name of readdirSync(lockDir())) {
      const found = new RegExp(`^browser\\.${kind}-(\\d+)\\.lock$`).exec(name);
      if (found) most = Math.max(most, Math.min(MOST_SLOTS, Number(found[1])));
    }
  } catch {
    // no folder yet: nobody holds anything
  }
  return Array.from({ length: most }, (_, index) => ({ kind, index, file: slotFile(kind, index) }));
}
