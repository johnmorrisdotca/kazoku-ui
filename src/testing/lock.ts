/// <reference types="node" />
import { randomUUID } from "node:crypto";
import { linkSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import process from "node:process";

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
  /** ISO time the lock was taken. */
  startedAt: string;
}

export interface BrowserLockOptions {
  /** How often to look again while waiting. 500 ms. */
  pollMs?: number;
  /** How often to say who is holding it while waiting. 30 000 ms. */
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

const lockDir = (): string => join(process.platform === "darwin" ? join(homedir(), "Library", "Caches") : process.env.XDG_CACHE_HOME || join(homedir(), ".cache"), "kazoku-ui");

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

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
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

/**
 * Take the browser lock, waiting while another run holds it. Only one headless browser should run at a time on a machine: with software GL, two at once make heavy
 * tests time out. The lock is a file in the user's cache folder (`~/Library/Caches/kazoku-ui` on a Mac, else `$XDG_CACHE_HOME` or `~/.cache`), made atomically,
 * and a lock whose pid is gone or that is over three hours old is taken over. While it waits it says who holds it, every 30 seconds. The lock is let go on exit, on
 * an error and on SIGINT, SIGTERM and SIGHUP, and a child process that inherits `KAZOKU_BROWSER_LOCK` runs under it without waiting. With `CI` set it does nothing.
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
  const { pollMs = 500, reportMs = 30_000, maxAgeMs = THREE_HOURS, log = (line: string) => void process.stderr.write(`${line}\n`) } = options;
  if (skipped()) return { release() {} };
  const file = lockFile();
  const inherited = process.env[ENV];
  if (inherited) {
    const current = readHolder(file);
    if (current && current.token === inherited && alive(current.pid)) return { release() {} };
  }
  mkdirSync(lockDir(), { recursive: true });
  const cwd = process.cwd();
  const holder: BrowserLockHolder = { token: randomUUID(), pid: process.pid, repo: repoName(cwd), cwd, command: process.argv.slice(1).join(" "), startedAt: new Date().toISOString() };
  const draft = `${file}.${holder.pid}.${holder.token}`;
  let reported = -Infinity;
  for (;;) {
    writeFileSync(draft, JSON.stringify(holder, null, 2));
    try {
      linkSync(draft, file);
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    } finally {
      rmSync(draft, { force: true });
    }
    const current = readHolder(file);
    if (!current || isStale(current, maxAgeMs)) clean(maxAgeMs);
    else if (Date.now() - reported >= reportMs) {
      reported = Date.now();
      log(`waiting for the browser lock: held by ${current.repo} pid ${current.pid} since ${new Date(current.startedAt).toLocaleString()}`);
    }
    await sleep(pollMs);
  }
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
