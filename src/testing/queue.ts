/// <reference types="node" />
import { mkdirSync, readdirSync, readFileSync, realpathSync, renameSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join, resolve, sep } from "node:path";
import process from "node:process";

/** A waiting run's place in the line: one small file in the queue folder, next to the lock. */
export interface BrowserQueueTicket {
  /** Tells this ticket from every other, and from the lock's own token. */
  token: string;
  pid: number;
  /** The package name from the waiter's `package.json`, else the folder name. */
  repo: string;
  cwd: string;
  command: string;
  /** The npm script that started the run (`test:demo`), when there is one. */
  script?: string;
  /** ISO time the run joined the line. The oldest live ticket goes next. */
  queuedAt: string;
}

/** A ticket nobody has touched for this long belongs to a stuck or recycled pid: it is cleared. A waiting run touches its ticket every ten seconds. */
export const TICKET_MAX_SILENCE_MS = 120_000;

/** Where the lock, the queue and the priority file live: `KAZOKU_BROWSER_LOCK_DIR`, else `kazoku-ui` in the user's cache folder. */
export const lockDir = (): string =>
  process.env.KAZOKU_BROWSER_LOCK_DIR || join(process.platform === "darwin" ? join(homedir(), "Library", "Caches") : process.env.XDG_CACHE_HOME || join(homedir(), ".cache"), "kazoku-ui");

export const queueDir = (): string => join(lockDir(), "queue");

export const priorityFile = (): string => join(lockDir(), "priority");

export function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

/** A folder's real path (a symlink such as macOS's /var is followed), else its absolute path when it is gone. */
const real = (dir: string): string => {
  try {
    return realpathSync(dir);
  } catch {
    return resolve(dir);
  }
};

/** True when a ticket's folder is `first` or lies inside it. */
const underFolder = (cwd: string, first: string): boolean => {
  const a = real(cwd);
  const b = real(first);
  return a === b || a.startsWith(b.endsWith(sep) ? b : b + sep);
};

/**
 * The order a line is served in: oldest ticket first, and the first ticket whose folder is the `priority` folder (or inside it) moved to the front. Pure: it reads
 * nothing and clears nothing.
 *
 * @example
 * const line = orderBrowserQueue(
 *   [
 *     { token: "a", pid: 1, repo: "one", cwd: "/p/one", command: "x", queuedAt: "2026-11-10T10:00:00.000Z" },
 *     { token: "b", pid: 2, repo: "two", cwd: "/p/two", command: "y", queuedAt: "2026-11-10T10:05:00.000Z" },
 *   ],
 *   "/p/two",
 * );
 * console.log(line.map((ticket) => ticket.repo)); // ["two", "one"]
 */
export function orderBrowserQueue(tickets: readonly BrowserQueueTicket[], priority: string | null = null): BrowserQueueTicket[] {
  const line = [...tickets].sort((a, b) => Date.parse(a.queuedAt) - Date.parse(b.queuedAt) || a.pid - b.pid || (a.token < b.token ? -1 : a.token > b.token ? 1 : 0));
  if (priority) {
    const at = line.findIndex((ticket) => underFolder(ticket.cwd, priority));
    if (at > 0) line.unshift(...line.splice(at, 1));
  }
  return line;
}

const ticketName = (ticket: BrowserQueueTicket): string => `${String(Date.parse(ticket.queuedAt)).padStart(15, "0")}-${ticket.pid}-${ticket.token}.json`;

/** Put a ticket in the queue folder, complete or not at all. Rejoining with the same `queuedAt` keeps the place. */
export function joinQueue(ticket: BrowserQueueTicket): string {
  mkdirSync(queueDir(), { recursive: true });
  const file = join(queueDir(), ticketName(ticket));
  const draft = join(queueDir(), `.${ticket.pid}-${ticket.token}.tmp`);
  writeFileSync(draft, JSON.stringify(ticket, null, 2));
  renameSync(draft, file);
  return file;
}

export function leaveQueue(ticket: BrowserQueueTicket): void {
  rmSync(join(queueDir(), ticketName(ticket)), { force: true });
}

/** Let the queue know this waiter is still there. */
export function touchTicket(ticket: BrowserQueueTicket): void {
  const now = new Date();
  try {
    utimesSync(join(queueDir(), ticketName(ticket)), now, now);
  } catch {
    // cleared by someone; the waiter notices and rejoins
  }
}

export interface ReadQueueOptions {
  /** Whether a pid is running. The real check. A test hands in a fake. */
  alive?: (pid: number) => boolean;
  /** Clear a ticket of a dead pid, and one silent for too long. True for a waiter, false for a command that only looks. */
  clean?: boolean;
  now?: number;
  maxSilenceMs?: number;
}

/** Who has the first say: the folder in the priority file, or null. */
export function readPriority(): string | null {
  try {
    return readFileSync(priorityFile(), "utf8").trim() || null;
  } catch {
    return null;
  }
}

/** The live tickets in the order they are served. A ticket whose pid is gone, or that has been silent too long, is not live, and with `clean` its file is removed. */
export function readQueue(options: ReadQueueOptions = {}): BrowserQueueTicket[] {
  const { alive: running = alive, clean = true, now = Date.now(), maxSilenceMs = TICKET_MAX_SILENCE_MS } = options;
  let names: string[] = [];
  try {
    names = readdirSync(queueDir());
  } catch {
    return [];
  }
  const live: BrowserQueueTicket[] = [];
  for (const name of names) {
    if (!name.endsWith(".json")) continue;
    const file = join(queueDir(), name);
    let ticket: BrowserQueueTicket | null = null;
    let silent = false;
    try {
      const parsed = JSON.parse(readFileSync(file, "utf8")) as BrowserQueueTicket;
      if (typeof parsed.pid === "number" && typeof parsed.token === "string" && typeof parsed.queuedAt === "string" && !Number.isNaN(Date.parse(parsed.queuedAt))) ticket = parsed;
      silent = now - statSync(file).mtimeMs > maxSilenceMs;
    } catch {
      // unreadable: treated as dead below
    }
    if (ticket && !silent && running(ticket.pid)) live.push(ticket);
    else if (clean) rmSync(file, { force: true });
  }
  return orderBrowserQueue(live, readPriority());
}

/**
 * Put one waiting run first: the oldest waiter whose folder is `cwd` (or inside it) is served before the rest. It does not take the lock from the run that holds it,
 * and the priority is spent when that waiter takes the lock. Pass null to remove it.
 *
 * @example
 * setBrowserPriority("/Users/john/Projects/hoshi-stars");
 * setBrowserPriority(null);
 */
export function setBrowserPriority(cwd: string | null): void {
  mkdirSync(lockDir(), { recursive: true });
  if (cwd === null) rmSync(priorityFile(), { force: true });
  else writeFileSync(priorityFile(), `${real(cwd)}\n`);
}

/** Spend the priority when the waiter it named has the lock. */
export function spendPriority(cwd: string): void {
  const first = readPriority();
  if (first && underFolder(cwd, first)) rmSync(priorityFile(), { force: true });
}

const ordinal = (n: number): string => {
  const rest = n % 100;
  if (rest >= 11 && rest <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
};

/** "2nd", "21st": for the waiting line. */
export const placeWord = ordinal;

/** Minutes a run may hold the browser before `kazoku-browser-queue status` warns. The run is never stopped for it. */
export const LONG_HOLD_MINUTES = 45;

/** How a run is named in a waiting line: the package and the npm script, else the start of its command. */
export function describeRun(run: { repo: string; command: string; script?: string }): string {
  const [first = "", ...rest] = run.command.split(" ");
  const short = [basename(first), ...rest].join(" ").trim();
  return `${run.repo} ${run.script || (short.length > 60 ? `${short.slice(0, 57)}...` : short)}`.trim();
}

