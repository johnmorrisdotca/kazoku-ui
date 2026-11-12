/// <reference types="node" />
import { mkdirSync, readdirSync, readFileSync, realpathSync, renameSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join, resolve, sep } from "node:path";
import process from "node:process";
import type { BrowserSlotKind } from "./slots.ts";

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
  /** Which kind of slot the run waits for. A ticket from an older kazoku-ui has none, and waits for a native slot. */
  kind?: BrowserSlotKind;
  /** ISO time the run joined the line. The oldest live ticket goes next. */
  queuedAt: string;
}

/** The kind of slot a ticket waits for. */
export const ticketKind = (ticket: { kind?: BrowserSlotKind }): BrowserSlotKind => (ticket.kind === "image" ? "image" : "native");

/** A ticket nobody has touched for this long belongs to a stuck or recycled pid: it is cleared. A waiting run touches its ticket every ten seconds. */
export const TICKET_MAX_SILENCE_MS = 120_000;

/** Where the lock, the queue and the priority file live: `KAZOKU_BROWSER_LOCK_DIR`, else `kazoku-ui` in the user's cache folder. */
export const lockDir = (): string =>
  process.env.KAZOKU_BROWSER_LOCK_DIR || join(process.platform === "darwin" ? join(homedir(), "Library", "Caches") : process.env.XDG_CACHE_HOME || join(homedir(), ".cache"), "kazoku-ui");

/**
 * The folder a kind's tickets are in: `queue` for native runs, as it always was, and `queue-image` for runs in the CI image. They are apart so that a run on an older kazoku-ui,
 * which reads every ticket in `queue` and knows nothing of kinds, never waits behind an image run.
 */
export const queueDir = (kind: BrowserSlotKind = "native"): string => join(lockDir(), kind === "image" ? "queue-image" : "queue");

/** The priority file of a kind: `priority` for native runs (as it always was), `priority-image` for runs in the CI image. */
export const priorityFile = (kind: BrowserSlotKind = "native"): string => join(lockDir(), kind === "image" ? "priority-image" : "priority");

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
  const dir = queueDir(ticketKind(ticket));
  mkdirSync(dir, { recursive: true });
  const file = join(dir, ticketName(ticket));
  const draft = join(dir, `.${ticket.pid}-${ticket.token}.tmp`);
  writeFileSync(draft, JSON.stringify(ticket, null, 2));
  renameSync(draft, file);
  return file;
}

export function leaveQueue(ticket: BrowserQueueTicket): void {
  rmSync(join(queueDir(ticketKind(ticket)), ticketName(ticket)), { force: true });
}

/** Let the queue know this waiter is still there. */
export function touchTicket(ticket: BrowserQueueTicket): void {
  const now = new Date();
  try {
    utimesSync(join(queueDir(ticketKind(ticket)), ticketName(ticket)), now, now);
  } catch {
    // cleared by someone; the waiter notices and rejoins
  }
}

export interface ReadQueueOptions {
  /** Whether a pid is running. The real check. A test hands in a fake. */
  alive?: (pid: number) => boolean;
  /** Clear a ticket of a dead pid, and one silent for too long. True for a waiter, false for a command that only looks. */
  clean?: boolean;
  /** Only this kind's line, in its own order. Without it: the native line, then the image line. */
  kind?: BrowserSlotKind;
  now?: number;
  maxSilenceMs?: number;
}

/** Who has the first say: the folder in the priority file of a kind (native unless told), or null. */
export function readPriority(kind: BrowserSlotKind = "native"): string | null {
  try {
    return readFileSync(priorityFile(kind), "utf8").trim() || null;
  } catch {
    return null;
  }
}

/** The live tickets in the order they are served, each kind's line on its own (a native run never waits behind an image run, nor the other way round). A ticket whose pid is gone, or that has been silent too long, is not live, and with `clean` its file is removed. */
export function readQueue(options: ReadQueueOptions = {}): BrowserQueueTicket[] {
  const { alive: running = alive, clean = true, kind, now = Date.now(), maxSilenceMs = TICKET_MAX_SILENCE_MS } = options;
  const live: BrowserQueueTicket[] = [];
  for (const of of kind ? [kind] : (["native", "image"] as const)) {
    let names: string[] = [];
    try {
      names = readdirSync(queueDir(of));
    } catch {
      continue;
    }
    for (const name of names) {
      if (!name.endsWith(".json")) continue;
      const file = join(queueDir(of), name);
      let ticket: BrowserQueueTicket | null = null;
      let silent = false;
      try {
        const parsed = JSON.parse(readFileSync(file, "utf8")) as BrowserQueueTicket;
        if (typeof parsed.pid === "number" && typeof parsed.token === "string" && typeof parsed.queuedAt === "string" && !Number.isNaN(Date.parse(parsed.queuedAt))) ticket = parsed;
        silent = now - statSync(file).mtimeMs > maxSilenceMs;
      } catch {
        // unreadable: treated as dead below
      }
      if (ticket && !silent && running(ticket.pid) && ticketKind(ticket) === of) live.push(ticket);
      else if (clean) rmSync(file, { force: true });
    }
  }
  const line = (of: BrowserSlotKind): BrowserQueueTicket[] => orderBrowserQueue(live.filter((ticket) => ticketKind(ticket) === of), readPriority(of));
  return kind ? line(kind) : [...line("native"), ...line("image")];
}

/**
 * Put one waiting run first: the oldest waiter whose folder is `cwd` (or inside it) is served before the rest. It does not take the lock from the run that holds it,
 * and the priority is spent when that waiter takes the lock. Pass null to remove it. A priority is for one kind of slot: the native line unless `kind` is `"image"`.
 *
 * @example
 * setBrowserPriority("/Users/john/Projects/hoshi-stars");
 * setBrowserPriority(null);
 */
export function setBrowserPriority(cwd: string | null, kind: BrowserSlotKind = "native"): void {
  mkdirSync(lockDir(), { recursive: true });
  if (cwd === null) rmSync(priorityFile(kind), { force: true });
  else writeFileSync(priorityFile(kind), `${real(cwd)}\n`);
}

/** Spend the priority of a kind when the waiter it named has a slot. */
export function spendPriority(cwd: string, kind: BrowserSlotKind = "native"): void {
  const first = readPriority(kind);
  if (first && underFolder(cwd, first)) rmSync(priorityFile(kind), { force: true });
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

/** How a run is named in a waiting line: the package and the npm script, else the program and its first words (no paths, no flags). */
export function describeRun(run: { repo: string; command: string; script?: string }): string {
  const [first = "", ...rest] = run.command.split(" ");
  const program = first.includes("@playwright/test/cli") ? "playwright" : basename(first);
  const words = [program, ...rest.filter((word) => word && !word.startsWith("-"))].slice(0, 3).join(" ");
  return `${run.repo} ${run.script || (words.length > 60 ? `${words.slice(0, 57)}...` : words)}`.trim();
}
