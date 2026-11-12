/// <reference types="node" />
import { randomUUID } from "node:crypto";
import { linkSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import process from "node:process";
import { alive, describeRun, joinQueue, leaveQueue, LONG_HOLD_MINUTES, lockDir, orderBrowserQueue, placeWord, readPriority, readQueue, spendPriority, touchTicket, type BrowserQueueTicket } from "./queue.ts";
import { browserSlots, slotsFile, slotsOf, type BrowserSlot, type BrowserSlotKind, type BrowserSlots } from "./slots.ts";


const ENV = "KAZOKU_BROWSER_LOCK";
const THREE_HOURS = 3 * 60 * 60 * 1000;
const SIGNALS = ["SIGINT", "SIGTERM", "SIGHUP"] as const;

/** Who holds the browser lock. */
export interface BrowserLockHolder {
  /** Handed to child processes in `KAZOKU_BROWSER_LOCK`, so they may run under the lock without waiting for it. */
  token: string;
  pid: number;
  /** The package name from the holder's `package.json`, else the folder name. */
  repo: string;
  cwd: string;
  command: string;
  /** The npm script that started the run (`test:demo`), when there is one. A holder from an older kazoku-ui has none. */
  script?: string;
  /** Which kind of slot it holds. A holder from an older kazoku-ui has none: a native slot. */
  kind?: BrowserSlotKind;
  /** Which slot of its kind, 0 for the first. */
  slot?: number;
  /** ISO time the lock was taken. */
  startedAt: string;
}

export interface BrowserLockOptions {
  /** How often to look again while waiting. 500 ms. */
  pollMs?: number;
  /** How often to say who is holding it and how far back in line the run is, while waiting. 60 000 ms. */
  reportMs?: number;
  /** A lock older than this is taken over even if its pid is alive. Three hours. */
  maxAgeMs?: number;
  /** Where the waiting line goes. Standard error. */
  log?: (line: string) => void;
  /**
   * Which kind of slot to take. `"native"` (the default) is the machine's own browser, one at a time unless the machine says more. `"image"` is a run in the CI image
   * container, as many at once as the machine's `browser-slots.json` says; with none set up it throws.
   */
  kind?: BrowserSlotKind;
}

/** A taken lock. */
export interface BrowserLock {
  /** Let go of the lock. Safe to call twice. */
  release(): void;
}

export interface BrowserLockStatus {
  /** The lock file's path. */
  file: string;
  /** Who holds it, or null when it is free. */
  holder: BrowserLockHolder | null;
  /** True when the holder's pid is gone or the lock is older than `maxAgeMs`: the next run takes it over. */
  stale: boolean;
}

const skipped = (): boolean => {
  const ci = process.env.CI;
  return Boolean(ci) && ci !== "false" && ci !== "0";
};

const lockFile = (): string => join(lockDir(), "browser.lock");

const holderKind = (holder: { kind?: BrowserSlotKind }): BrowserSlotKind => (holder.kind === "image" ? "image" : "native");

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function readHolder(file: string): BrowserLockHolder | null {
  try {
    const holder = JSON.parse(readFileSync(file, "utf8")) as BrowserLockHolder;
    return typeof holder.pid === "number" && typeof holder.token === "string" ? holder : null;
  } catch {
    return null;
  }
}

const isStale = (holder: BrowserLockHolder, maxAgeMs: number): boolean => !alive(holder.pid) || !(Date.now() - Date.parse(holder.startedAt) <= maxAgeMs);

const repoName = (cwd: string): string => {
  try {
    const name = (JSON.parse(readFileSync(join(cwd, "package.json"), "utf8")) as { name?: unknown }).name;
    if (typeof name === "string" && name) return name.replace(/^@[^/]+\//, "");
  } catch {
    // no package.json: the folder name will do
  }
  return basename(cwd);
};

/** Remove a slot's lock file if it is stale (or `force`), one cleaner at a time so a fresh lock is never removed by mistake. */
function clean(file: string, maxAgeMs: number, force = false): boolean {
  const mutex = `${file}.cleaning`;
  try {
    mkdirSync(mutex);
  } catch {
    try {
      if (Date.now() - statSync(mutex).mtimeMs > 30_000) rmSync(mutex, { recursive: true, force: true });
    } catch {
      // the other cleaner finished
    }
    return false;
  }
  try {
    const holder = readHolder(file);
    if (!force && holder && !isStale(holder, maxAgeMs)) return false;
    rmSync(file, { force: true });
    return true;
  } finally {
    rmSync(mutex, { recursive: true, force: true });
  }
}

const minutesSince = (iso: string, now = Date.now()): number => Math.max(0, Math.floor((now - Date.parse(iso)) / 60_000));

/**
 * Take a browser slot, waiting while the machine's slots of that kind are all held. Only one headless browser should run natively at a time on a machine: with software
 * GL, two at once make heavy tests time out. The lock is a file in the user's cache folder (`~/Library/Caches/kazoku-ui` on a Mac, else `$XDG_CACHE_HOME` or `~/.cache`;
 * `KAZOKU_BROWSER_LOCK_DIR` names another folder), made atomically, and a lock whose pid is gone or that is over three hours old is taken over.
 *
 * A machine also has slots for runs in the CI image (a container with its CPUs and memory fenced, so several can run at once): `kind: "image"` takes one. How many of each
 * is in `~/.config/kazoku-ui/browser-slots.json` (`{ "native": 1, "image": 4 }`); without the file a machine has one native slot and no image slots, so nothing changes
 * until it is set up. The native run and the image runs never wait for each other. See `browserSlots`.
 *
 * Waiting runs are served in the order they arrived, each kind in its own line. Each writes a ticket in the `queue` folder next to the lock, and only the oldest live tickets,
 * as many as there are free slots, may take them; a ticket whose pid is gone is cleared. One waiter can be put first with `setBrowserPriority`. While it waits a run says, once a
 * minute, how far back it is and who holds the lock. The lock is let go on exit, on an error and on SIGINT, SIGTERM and SIGHUP, and a child process that inherits
 * `KAZOKU_BROWSER_LOCK` runs under it without waiting. With `CI` set it does nothing. A run on the older lock code, with no queue, still works alongside: it takes the
 * native slot whenever it is free.
 *
 * @example
 * const lock = await acquireBrowserLock();
 * try {
 *   const browser = await chromium.launch({ args: [...SOFTWARE_GL_ARGS] });
 *   // ...
 *   await browser.close();
 * } finally {
 *   lock.release();
 * }
 */
export async function acquireBrowserLock(options: BrowserLockOptions = {}): Promise<BrowserLock> {
  const { pollMs = 500, reportMs = 60_000, maxAgeMs = THREE_HOURS, kind = "native", log = (line: string) => void process.stderr.write(`${line}\n`) } = options;
  if (skipped()) return { release() {} };
  if (kind === "image" && browserSlots().image < 1) {
    throw new Error(`this machine has no slots for runs in the CI image; set them in ${slotsFile()}, for example {"native": 1, "image": 4}`);
  }
  const inherited = process.env[ENV];
  if (inherited) {
    for (const slot of [...slotsOf("native"), ...slotsOf("image")]) {
      const current = readHolder(slot.file);
      if (current && current.token === inherited && holderKind(current) === kind && alive(current.pid)) return { release() {} };
    }
  }
  mkdirSync(lockDir(), { recursive: true });
  const cwd = process.cwd();
  const holder: BrowserLockHolder = {
    token: randomUUID(),
    pid: process.pid,
    repo: repoName(cwd),
    cwd,
    command: process.argv.slice(1).join(" "),
    ...(process.env.npm_lifecycle_event ? { script: process.env.npm_lifecycle_event } : {}),
    ...(kind === "image" ? { kind } : {}),
    startedAt: new Date().toISOString(),
  };
  const ticket: BrowserQueueTicket = {
    token: holder.token,
    pid: holder.pid,
    repo: holder.repo,
    cwd,
    command: holder.command,
    ...(holder.script ? { script: holder.script } : {}),
    ...(kind === "image" ? { kind } : {}),
    queuedAt: holder.startedAt,
  };
  const leave = (): void => leaveQueue(ticket);
  joinQueue(ticket);
  process.on("exit", leave);
  let reported = -Infinity;
  let touched = Date.now();
  let taken: BrowserSlot | null = null;
  try {
    for (;;) {
      const line = readQueue({ kind });
      let place = line.findIndex((one) => one.token === ticket.token);
      if (place === -1) {
        joinQueue(ticket);
        place = readQueue({ kind }).findIndex((one) => one.token === ticket.token);
      }
      const slots = slotsOf(kind);
      const free: BrowserSlot[] = [];
      const held: BrowserLockHolder[] = [];
      let cleared = false;
      for (const slot of slots) {
        const current = readHolder(slot.file);
        if (current && isStale(current, maxAgeMs)) {
          clean(slot.file, maxAgeMs);
          cleared = true;
          break;
        }
        if (current) held.push(current);
        else free.push(slot);
      }
      if (cleared) continue;
      // The machine's count is the limit. A slot above it that a run still holds (the count was lowered under it) counts as held, so the runs never exceed the limit.
      const limit = browserSlots()[kind];
      const usable = free.filter((slot) => slot.index < limit);
      const room = Math.min(usable.length, Math.max(0, limit - held.length));
      if (room > 0 && place <= room - 1) {
        // One of the oldest live tickets, and a slot is free for it: take one. Only a run on the older lock code, which does not queue, can have taken the native one in between.
        for (const slot of usable) {
          const draft = `${slot.file}.${holder.pid}.${holder.token}`;
          writeFileSync(draft, JSON.stringify({ ...holder, slot: slot.index, startedAt: new Date().toISOString() }, null, 2));
          try {
            linkSync(draft, slot.file);
            taken = slot;
            break;
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
            clean(slot.file, maxAgeMs); // a file nobody can read is cleared; a lock someone else just took is left alone
          } finally {
            rmSync(draft, { force: true });
          }
        }
        if (taken) break;
      } else if (Date.now() - reported >= reportMs) {
        reported = Date.now();
        const oldest = [...held].sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt))[0];
        const ahead = !oldest
          ? "the lock is free for the run ahead"
          : limit === 1
            ? `holder ${describeRun(oldest)} for ${minutesSince(oldest.startedAt)} min`
            : `${held.length} of ${limit} slots held, the longest by ${describeRun(oldest)} for ${minutesSince(oldest.startedAt)} min`;
        log(`waiting for ${kind === "image" ? "an image slot" : "the browser"}: ${placeWord(Math.max(place, 0) + 1)} in line, ${ahead}`);
      }
      if (Date.now() - touched >= 10_000) {
        touched = Date.now();
        touchTicket(ticket);
      }
      await sleep(pollMs);
    }
  } finally {
    process.off("exit", leave);
    leave();
  }
  const file = (taken as BrowserSlot).file;
  spendPriority(cwd, kind);
  process.env[ENV] = holder.token;
  let released = false;
  const release = (): void => {
    if (released) return;
    released = true;
    process.off("exit", release);
    for (const signal of SIGNALS) process.off(signal, onSignal);
    if (readHolder(file)?.token === holder.token) rmSync(file, { force: true });
    if (process.env[ENV] === holder.token) delete process.env[ENV];
  };
  const onSignal = (signal: NodeJS.Signals): void => {
    if (process.listenerCount(signal) > 1) return;
    release();
    process.kill(process.pid, signal);
  };
  process.on("exit", release);
  for (const signal of SIGNALS) process.on(signal, onSignal);
  return { release };
}

/**
 * Run `fn` under the browser lock and let go of it afterwards, whether `fn` returns or throws. For a script that launches Chromium itself.
 *
 * @example
 * await withBrowserLock(async () => {
 *   const browser = await chromium.launch({ args: [...SOFTWARE_GL_ARGS] });
 *   try {
 *     // ...
 *   } finally {
 *     await browser.close();
 *   }
 * });
 */
export async function withBrowserLock<T>(fn: () => Promise<T> | T, options?: BrowserLockOptions): Promise<T> {
  const lock = await acquireBrowserLock(options);
  try {
    return await fn();
  } finally {
    lock.release();
  }
}

/**
 * Who holds the first native browser lock now, if anyone, and whether it is stale. For every slot, native and image, see `browserSlotStatuses`.
 *
 * @example
 * const { holder, stale } = browserLockStatus();
 * if (holder && !stale) console.log(`held by ${holder.repo} pid ${holder.pid}`);
 */
export function browserLockStatus(options: Pick<BrowserLockOptions, "maxAgeMs"> = {}): BrowserLockStatus {
  const file = lockFile();
  const holder = readHolder(file);
  return { file, holder, stale: holder ? isStale(holder, options.maxAgeMs ?? THREE_HOURS) : false };
}

/** One slot as the status shows it. */
export interface BrowserSlotStatus extends BrowserLockStatus {
  kind: BrowserSlotKind;
  /** 0 for the first slot of its kind. */
  index: number;
  /** Whole minutes the holder has had the slot, or null when it is free. */
  heldMinutes: number | null;
}

/**
 * Every slot the machine has, native first and then image, with who holds it. It only looks.
 *
 * @example
 * for (const { kind, index, holder } of browserSlotStatuses()) console.log(kind, index + 1, holder ? holder.repo : "free");
 */
export function browserSlotStatuses(options: Pick<BrowserLockOptions, "maxAgeMs"> & { now?: number } = {}): BrowserSlotStatus[] {
  const { now = Date.now(), maxAgeMs = THREE_HOURS } = options;
  return [...slotsOf("native"), ...slotsOf("image")].map(({ kind, index, file }) => {
    const holder = readHolder(file);
    return { kind, index, file, holder, stale: holder ? isStale(holder, maxAgeMs) : false, heldMinutes: holder ? minutesSince(holder.startedAt, now) : null };
  });
}

/**
 * Remove a stale browser lock by hand. A lock whose holder is still running stays unless `force` is true. Returns true when a lock file was removed. Every slot is looked at,
 * native and image.
 *
 * @example
 * if (clearBrowserLock()) console.log("cleared a stale lock");
 */
export function clearBrowserLock(options: Pick<BrowserLockOptions, "maxAgeMs"> & { force?: boolean } = {}): boolean {
  let removed = false;
  for (const { file, holder } of browserSlotStatuses(options)) {
    if (holder && clean(file, options.maxAgeMs ?? THREE_HOURS, options.force)) removed = true;
  }
  return removed;
}


/** One waiter in the line, as the status shows it. */
export interface BrowserQueueEntry {
  /** 1 is next, in the line of its own kind. */
  place: number;
  /** Which line it waits in. */
  kind: BrowserSlotKind;
  ticket: BrowserQueueTicket;
  /** Whole minutes since it joined. */
  waitedMinutes: number;
  /** True when the priority file put it first. */
  byPriority: boolean;
}

export interface BrowserQueueStatus extends BrowserLockStatus {
  /** Whole minutes the holder of the first native slot has had it, or null when it is free. */
  heldMinutes: number | null;
  /** Every slot, native and then image, with its holder. `holder`, `stale` and `file` above are the first native one. */
  slots: BrowserSlotStatus[];
  /** How many slots of each kind the machine has (from its `browser-slots.json`). */
  configured: BrowserSlots;
  /** The waiters, native line first and then the image line, each in the order it is served. Tickets of dead pids are left out. */
  queue: BrowserQueueEntry[];
  /** The folder the native priority file names, or null. */
  priority: string | null;
  /** The folder the image priority file names, or null. */
  imagePriority: string | null;
  /** Lines to show a person: a holder over `LONG_HOLD_MINUTES`, a stale lock. */
  warnings: string[];
}

/**
 * The whole picture: every slot and who holds it and for how long, the waiters in the order they will be served, the priorities if any is set, and a warning when a holder has
 * had a slot for more than 45 minutes. It only looks: it clears nothing, so it is safe to run while others are testing.
 *
 * @example
 * const { slots, queue, warnings } = browserQueueStatus();
 * for (const { kind, index, holder, heldMinutes } of slots) console.log(kind, index + 1, holder ? `${holder.repo} for ${heldMinutes} min` : "free");
 * console.log(queue.length, "waiting", warnings);
 */
export function browserQueueStatus(options: Pick<BrowserLockOptions, "maxAgeMs"> & { now?: number; alive?: (pid: number) => boolean } = {}): BrowserQueueStatus {
  const { now = Date.now(), alive: running } = options;
  const base = browserLockStatus(options);
  const slots = browserSlotStatuses({ ...options, now });
  const priority = readPriority("native");
  const imagePriority = readPriority("image");
  const queue: BrowserQueueEntry[] = [];
  for (const kind of ["native", "image"] as const) {
    const line = readQueue({ clean: false, kind, now, ...(running ? { alive: running } : {}) });
    const first = readPriority(kind);
    const oldest = orderBrowserQueue(line, null)[0];
    line.forEach((ticket, index) => queue.push({ place: index + 1, kind, ticket, waitedMinutes: minutesSince(ticket.queuedAt, now), byPriority: index === 0 && first !== null && ticket.token !== oldest?.token }));
  }
  const heldMinutes = base.holder ? minutesSince(base.holder.startedAt, now) : null;
  const warnings: string[] = [];
  for (const slot of slots) {
    if (!slot.holder) continue;
    const name = slot.kind === "native" && slots.filter((one) => one.kind === "native").length === 1 ? "the lock" : `${slot.kind} slot ${slot.index + 1}`;
    if (slot.stale) warnings.push(`${name} is stale (its pid is gone or it is over three hours old): the next run takes it over`);
    else if (slot.heldMinutes !== null && slot.heldMinutes > LONG_HOLD_MINUTES)
      warnings.push(`${describeRun(slot.holder)} has held ${slot.kind === "native" ? "the browser" : name} for ${slot.heldMinutes} min (over ${LONG_HOLD_MINUTES}); look at it, nothing here stops it`);
  }
  return { ...base, heldMinutes, slots, configured: browserSlots(), queue, priority, imagePriority, warnings };
}
