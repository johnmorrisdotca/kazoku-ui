/// <reference types="node" />
import { randomUUID } from "node:crypto";
import { linkSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import process from "node:process";
import { alive, describeRun, joinQueue, leaveQueue, LONG_HOLD_MINUTES, lockDir, orderBrowserQueue, placeWord, readPriority, readQueue, spendPriority, touchTicket, type BrowserQueueTicket } from "./queue.ts";


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

/** Remove the lock file if it is stale (or `force`), one cleaner at a time so a fresh lock is never removed by mistake. */
function clean(maxAgeMs: number, force = false): boolean {
  const mutex = `${lockFile()}.cleaning`;
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
    const holder = readHolder(lockFile());
    if (!force && holder && !isStale(holder, maxAgeMs)) return false;
    rmSync(lockFile(), { force: true });
    return true;
  } finally {
    rmSync(mutex, { recursive: true, force: true });
  }
}

const minutesSince = (iso: string, now = Date.now()): number => Math.max(0, Math.floor((now - Date.parse(iso)) / 60_000));

/**
 * Take the browser lock, waiting while another run holds it. Only one headless browser should run at a time on a machine: with software GL, two at once make heavy
 * tests time out. The lock is a file in the user's cache folder (`~/Library/Caches/kazoku-ui` on a Mac, else `$XDG_CACHE_HOME` or `~/.cache`; `KAZOKU_BROWSER_LOCK_DIR`
 * names another folder), made atomically, and a lock whose pid is gone or that is over three hours old is taken over.
 *
 * Waiting runs are served in the order they arrived. Each writes a ticket in the `queue` folder next to the lock, and only the oldest live ticket may take the lock when
 * it is free; a ticket whose pid is gone is cleared. One waiter can be put first with `setBrowserPriority`. While it waits a run says, once a minute, how far back it is
 * and who holds the lock. The lock is let go on exit, on an error and on SIGINT, SIGTERM and SIGHUP, and a child process that inherits `KAZOKU_BROWSER_LOCK` runs under
 * it without waiting. With `CI` set it does nothing. A run on the older lock code, with no queue, still works alongside: it takes the lock whenever it is free.
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
  const { pollMs = 500, reportMs = 60_000, maxAgeMs = THREE_HOURS, log = (line: string) => void process.stderr.write(`${line}\n`) } = options;
  if (skipped()) return { release() {} };
  const file = lockFile();
  const inherited = process.env[ENV];
  if (inherited) {
    const current = readHolder(file);
    if (current && current.token === inherited && alive(current.pid)) return { release() {} };
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
    startedAt: new Date().toISOString(),
  };
  const ticket: BrowserQueueTicket = { token: holder.token, pid: holder.pid, repo: holder.repo, cwd, command: holder.command, ...(holder.script ? { script: holder.script } : {}), queuedAt: holder.startedAt };
  const draft = `${file}.${holder.pid}.${holder.token}`;
  const leave = (): void => leaveQueue(ticket);
  joinQueue(ticket);
  process.on("exit", leave);
  let reported = -Infinity;
  let touched = Date.now();
  try {
    for (;;) {
      const line = readQueue();
      let place = line.findIndex((one) => one.token === ticket.token);
      if (place === -1) {
        joinQueue(ticket);
        place = readQueue().findIndex((one) => one.token === ticket.token);
      }
      const current = readHolder(file);
      if (current && isStale(current, maxAgeMs)) {
        clean(maxAgeMs);
        continue;
      }
      if (!current && place <= 0) {
        // The oldest live ticket, and the lock is free: take it. Only a run on the older lock code, which does not queue, can have taken it in between.
        writeFileSync(draft, JSON.stringify({ ...holder, startedAt: new Date().toISOString() }, null, 2));
        try {
          linkSync(draft, file);
          break;
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
          clean(maxAgeMs); // a file nobody can read is cleared; a lock someone else just took is left alone
        } finally {
          rmSync(draft, { force: true });
        }
      } else if (Date.now() - reported >= reportMs) {
        reported = Date.now();
        const ahead = current ? `holder ${describeRun(current)} for ${minutesSince(current.startedAt)} min` : "the lock is free for the run ahead";
        log(`waiting for the browser: ${placeWord(Math.max(place, 0) + 1)} in line, ${ahead}`);
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
  spendPriority(cwd);
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
 * Who holds the browser lock now, if anyone, and whether it is stale.
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

/**
 * Remove a stale browser lock by hand. A lock whose holder is still running stays unless `force` is true. Returns true when a lock file was removed.
 *
 * @example
 * if (clearBrowserLock()) console.log("cleared a stale lock");
 */
export function clearBrowserLock(options: Pick<BrowserLockOptions, "maxAgeMs"> & { force?: boolean } = {}): boolean {
  const { holder } = browserLockStatus(options);
  if (!holder) return false;
  return clean(options.maxAgeMs ?? THREE_HOURS, options.force);
}


/** One waiter in the line, as the status shows it. */
export interface BrowserQueueEntry {
  /** 1 is next. */
  place: number;
  ticket: BrowserQueueTicket;
  /** Whole minutes since it joined. */
  waitedMinutes: number;
  /** True when the priority file put it first. */
  byPriority: boolean;
}

export interface BrowserQueueStatus extends BrowserLockStatus {
  /** Whole minutes the holder has had the lock, or null when it is free. */
  heldMinutes: number | null;
  /** The waiters, in the order they are served. Tickets of dead pids are left out. */
  queue: BrowserQueueEntry[];
  /** The folder the priority file names, or null. */
  priority: string | null;
  /** Lines to show a person: a holder over `LONG_HOLD_MINUTES`, a stale lock. */
  warnings: string[];
}

/**
 * The whole picture: who holds the lock and for how long, the waiters in the order they will be served, the priority if one is set, and a warning when a holder has had
 * the lock for more than 45 minutes. It only looks: it clears nothing, so it is safe to run while others are testing.
 *
 * @example
 * const { holder, heldMinutes, queue, warnings } = browserQueueStatus();
 * console.log(holder ? `${holder.repo} for ${heldMinutes} min` : "free", queue.length, "waiting", warnings);
 */
export function browserQueueStatus(options: Pick<BrowserLockOptions, "maxAgeMs"> & { now?: number; alive?: (pid: number) => boolean } = {}): BrowserQueueStatus {
  const { now = Date.now(), alive: running } = options;
  const base = browserLockStatus(options);
  const priority = readPriority();
  const queue = readQueue({ clean: false, now, ...(running ? { alive: running } : {}) });
  const oldest = orderBrowserQueue(queue, null)[0];
  const heldMinutes = base.holder ? minutesSince(base.holder.startedAt, now) : null;
  const warnings: string[] = [];
  if (base.holder && base.stale) warnings.push(`the lock is stale (its pid is gone or it is over three hours old): the next run takes it over`);
  else if (base.holder && heldMinutes !== null && heldMinutes > LONG_HOLD_MINUTES)
    warnings.push(`${describeRun(base.holder)} has held the browser for ${heldMinutes} min (over ${LONG_HOLD_MINUTES}); look at it, nothing here stops it`);
  return {
    ...base,
    heldMinutes,
    queue: queue.map((ticket, index) => ({ place: index + 1, ticket, waitedMinutes: minutesSince(ticket.queuedAt, now), byPriority: index === 0 && priority !== null && ticket.token !== oldest?.token })),
    priority,
    warnings,
  };
}
