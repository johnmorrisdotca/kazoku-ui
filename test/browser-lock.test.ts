import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, beforeEach, test } from "node:test";
import { pathToFileURL } from "node:url";
import { acquireBrowserLock, browserLockStatus, browserQueueStatus, clearBrowserLock, orderBrowserQueue, setBrowserPriority, withBrowserLock } from "../src/testing/index.ts";
import { describeRun, joinQueue, readPriority, readQueue, type BrowserQueueTicket } from "../src/testing/queue.ts";

const lockModule = pathToFileURL(join(import.meta.dirname, "../src/testing/lock.ts")).href;
const cli = join(import.meta.dirname, "../src/testing/cli.ts");
const saved = { ...process.env };
const home = mkdtempSync(join(tmpdir(), "kazoku-lock-"));
const cache = process.platform === "darwin" ? join(home, "Library", "Caches") : join(home, ".cache");
const file = join(cache, "kazoku-ui", "browser.lock");
const children: ChildProcess[] = [];

const env = (): NodeJS.ProcessEnv => {
  const clean: NodeJS.ProcessEnv = { ...process.env, HOME: home, XDG_CACHE_HOME: join(home, ".cache") };
  delete clean.CI;
  delete clean.KAZOKU_BROWSER_LOCK;
  delete clean.KAZOKU_BROWSER_LOCK_DIR;
  delete clean.npm_lifecycle_event; // set when the tests run under pnpm
  return clean;
};

before(() => {
  process.env.HOME = home;
  process.env.XDG_CACHE_HOME = join(home, ".cache");
  delete process.env.CI;
  delete process.env.KAZOKU_BROWSER_LOCK;
  delete process.env.KAZOKU_BROWSER_LOCK_DIR;
  assert.ok(browserLockStatus().file.startsWith(home), "these tests never touch the real lock");
});

beforeEach(() => {
  rmSync(join(home, ".cache"), { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
  rmSync(join(home, "Library"), { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
});

after(() => {
  for (const child of children) child.kill("SIGKILL");
  process.env = saved;
  rmSync(home, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
});

/** A node process that runs `body` with `acquire` (the lock module's acquireBrowserLock) in scope, and lines it prints. */
function run(body: string, extra: NodeJS.ProcessEnv = {}, cwd?: string) {
  const child = spawn(process.execPath, ["--input-type=module", "-e", `import * as lock from ${JSON.stringify(lockModule)};\n${body}`], { env: { ...env(), ...extra }, stdio: ["ignore", "pipe", "pipe"], ...(cwd ? { cwd } : {}) });
  children.push(child);
  let out = "";
  child.stdout.on("data", (chunk: Buffer) => (out += chunk));
  child.stderr.on("data", (chunk: Buffer) => (out += chunk));
  const done = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve) => child.on("exit", (code, signal) => resolve({ code, signal })));
  const printed = (text: string, ms = 10_000) =>
    new Promise<void>((resolve, reject) => {
      const started = Date.now();
      const look = (): void => {
        if (out.includes(text)) resolve();
        else if (Date.now() - started > ms) reject(new Error(`never printed ${JSON.stringify(text)}; got ${JSON.stringify(out)}`));
        else setTimeout(look, 20);
      };
      look();
    });
  return { child, done, printed, output: () => out };
}

const holding = (ms: number) => `const l = await lock.acquireBrowserLock(); console.log("held"); await new Promise((r) => setTimeout(r, ${ms})); l.release(); console.log("let go");`;

test("a second process waits for the first and then runs", async () => {
  const first = run(holding(1200));
  await first.printed("held");
  const second = run(`await lock.acquireBrowserLock({ pollMs: 50, reportMs: 100, log: console.log }); console.log("ran");`);
  await second.printed("ran");
  assert.match(second.output(), new RegExp(`waiting for the browser: 1st in line, holder .+ for \\d+ min\\nran`));
  assert.ok(first.output().includes("let go"), "the first let go before the second ran");
  await Promise.all([first.done, second.done]);
  assert.equal(existsSync(file), false, "released at the end");
});

test("a lock whose pid is gone is taken over", async () => {
  const dead = run("");
  await dead.done;
  mkdirSync(join(cache, "kazoku-ui"), { recursive: true });
  writeFileSync(file, JSON.stringify({ token: "old", pid: dead.child.pid, repo: "gone", cwd: "/", command: "x", startedAt: new Date().toISOString() }));
  assert.equal(browserLockStatus().stale, true);
  const lock = await acquireBrowserLock({ pollMs: 20 });
  assert.equal(browserLockStatus().holder?.pid, process.pid);
  lock.release();
  assert.equal(existsSync(file), false);
});

test("a lock over the maximum age is taken over even if its pid is alive", async () => {
  mkdirSync(join(cache, "kazoku-ui"), { recursive: true });
  const started = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
  writeFileSync(file, JSON.stringify({ token: "old", pid: process.pid, repo: "slow", cwd: "/", command: "x", startedAt: started }));
  assert.equal(browserLockStatus().stale, true);
  const lock = await acquireBrowserLock({ pollMs: 20 });
  assert.notEqual(browserLockStatus().holder?.token, "old");
  lock.release();
});

test("a child that inherits the token runs under the lock without waiting", async () => {
  await withBrowserLock(async () => {
    const token = browserLockStatus().holder?.token;
    assert.ok(token);
    const child = run(`const l = await lock.acquireBrowserLock({ pollMs: 20, reportMs: 20, log: console.log }); console.log("entered"); l.release(); console.log("done");`, { KAZOKU_BROWSER_LOCK: process.env.KAZOKU_BROWSER_LOCK });
    assert.equal((await child.done).code, 0);
    assert.ok(!child.output().includes("waiting"), child.output());
    assert.equal(browserLockStatus().holder?.token, token, "the child's release left the parent's lock alone");
    const stranger = run(`await lock.acquireBrowserLock({ pollMs: 20, reportMs: 20, log: console.log }); console.log("entered");`);
    await stranger.printed("waiting for the browser:");
    stranger.child.kill("SIGKILL");
    await stranger.done;
  });
  assert.equal(existsSync(file), false);
});

test("the lock is released on SIGTERM", async () => {
  const holder = run(holding(60_000));
  await holder.printed("held");
  assert.equal(existsSync(file), true);
  holder.child.kill("SIGTERM");
  assert.equal((await holder.done).signal, "SIGTERM");
  assert.equal(existsSync(file), false);
});

test("the lock is released when the process throws or exits", async () => {
  const thrower = run(`await lock.acquireBrowserLock(); throw new Error("boom");`);
  assert.equal((await thrower.done).code, 1);
  assert.equal(existsSync(file), false);
  const exiter = run(`await lock.acquireBrowserLock(); process.exit(3);`);
  assert.equal((await exiter.done).code, 3);
  assert.equal(existsSync(file), false);
});

test("withBrowserLock lets go when the function throws", async () => {
  await assert.rejects(withBrowserLock(() => Promise.reject(new Error("no"))), /no/);
  assert.equal(existsSync(file), false);
  assert.equal(await withBrowserLock(() => 7), 7);
});

test("with CI set the lock is skipped", async () => {
  const holder = run(holding(60_000));
  await holder.printed("held");
  const before = readFileSync(file, "utf8");
  process.env.CI = "true";
  try {
    const lock = await acquireBrowserLock({ pollMs: 20 });
    lock.release();
    assert.equal(readFileSync(file, "utf8"), before, "CI neither waited nor touched the other run's lock");
  } finally {
    delete process.env.CI;
  }
  holder.child.kill("SIGTERM");
  await holder.done;
});

test("the command line shows who holds the lock and clears a stale one", async () => {
  const status = (...args: string[]) => {
    const child = spawn(process.execPath, [cli, ...args], { env: env() });
    let out = "";
    child.stdout.on("data", (chunk: Buffer) => (out += chunk));
    return new Promise<{ code: number | null; out: string }>((resolve) => child.on("exit", (code) => resolve({ code, out })));
  };
  assert.match((await status("status")).out, /is free/);
  const holder = run(holding(60_000));
  await holder.printed("held");
  const held = await status("status");
  assert.equal(held.code, 1);
  assert.match(held.out, new RegExp(`held by .+ pid ${holder.child.pid}`));
  assert.equal((await status("clear")).code, 1, "a running holder is not cleared");
  assert.equal(existsSync(file), true);
  holder.child.kill("SIGKILL");
  await holder.done;
  assert.match((await status("status")).out, /stale/);
  assert.match((await status("clear")).out, /cleared/);
  assert.equal(existsSync(file), false);
  assert.equal(clearBrowserLock(), false);
});

test("six processes at once never hold the lock together", async () => {
  const log = join(home, "order.log");
  const body = `import { appendFileSync } from "node:fs"; const l = await lock.acquireBrowserLock({ pollMs: 10 }); appendFileSync(${JSON.stringify(log)}, "in\\n"); await new Promise((r) => setTimeout(r, 40)); appendFileSync(${JSON.stringify(log)}, "out\\n"); l.release();`;
  const runs = Array.from({ length: 6 }, () => run(body));
  await Promise.all(runs.map((one) => one.done));
  assert.deepEqual(readFileSync(log, "utf8").trim().split("\n"), Array.from({ length: 6 }, () => ["in", "out"]).flat());
});

// ---- the queue ----

const queueDir = join(cache, "kazoku-ui", "queue");
const priorityPath = join(cache, "kazoku-ui", "priority");
const folder = (name: string): string => {
  const dir = join(home, "work", name);
  mkdirSync(dir, { recursive: true });
  return dir;
};
const tickets = (): number => (existsSync(queueDir) ? readdirSync(queueDir).filter((name) => name.endsWith(".json")).length : 0);
const until = async (ok: () => boolean, ms = 10_000): Promise<void> => {
  const started = Date.now();
  while (!ok()) {
    if (Date.now() - started > ms) throw new Error("timed out waiting for the queue");
    await new Promise((r) => setTimeout(r, 20));
  }
};
const ticket = (over: Partial<BrowserQueueTicket>): BrowserQueueTicket => ({ token: "t", pid: process.pid, repo: "r", cwd: "/p/r", command: "c", queuedAt: "2026-11-10T10:00:00.000Z", ...over });
/** A pid that is certainly gone: a process that has already exited. */
async function deadPid(): Promise<number> {
  const gone = run("");
  await gone.done;
  return gone.child.pid as number;
}
/** A waiter that records "in <name>" in the shared log when it gets the lock. */
const waiter = (name: string, log: string, dir: string, pollMs = 20) =>
  run(`import { appendFileSync } from "node:fs"; const l = await lock.acquireBrowserLock({ pollMs: ${pollMs}, reportMs: 100, log: console.log }); appendFileSync(${JSON.stringify(log)}, ${JSON.stringify(name + "\n")}); await new Promise((r) => setTimeout(r, 30)); l.release();`, {}, dir);

test("waiters are served in the order they arrived, not by who polls first", async () => {
  const log = join(home, "fifo.log");
  const holder = run(holding(60_000), {}, folder("holder"));
  await holder.printed("held");
  // The first to arrive polls slowly, the last polls fast: with the old race the fast one would win.
  const runs: ReturnType<typeof waiter>[] = [];
  for (const [name, pollMs] of [["a", 300], ["b", 120], ["c", 5], ["d", 5]] as const) {
    runs.push(waiter(name, log, folder(name), pollMs));
    await until(() => tickets() === runs.length);
  }
  holder.child.kill("SIGTERM");
  await holder.done;
  await Promise.all(runs.map((one) => one.done));
  assert.deepEqual(readFileSync(log, "utf8").trim().split("\n"), ["a", "b", "c", "d"]);
  assert.equal(tickets(), 0, "every ticket is gone");
  assert.equal(existsSync(file), false);
});

test("a waiting run says its place and who holds the lock", async () => {
  const log = join(home, "say.log");
  const holder = run(holding(60_000), { npm_lifecycle_event: "test:demo" }, folder("hoshi-stars"));
  await holder.printed("held");
  const one = waiter("one", log, folder("one"));
  await until(() => tickets() === 1);
  const two = waiter("two", log, folder("two"));
  await two.printed("2nd in line");
  assert.match(one.output(), /waiting for the browser: 1st in line, holder hoshi-stars test:demo for 0 min/);
  assert.match(two.output(), /waiting for the browser: 2nd in line, holder hoshi-stars test:demo for 0 min/);
  holder.child.kill("SIGTERM");
  await Promise.all([holder.done, one.done, two.done]);
});

test("the ticket of a dead pid is cleared and does not block the line", async () => {
  const gone = await deadPid();
  joinQueue(ticket({ token: "ghost", pid: gone, queuedAt: "2020-01-01T00:00:00.000Z" }));
  assert.equal(tickets(), 1);
  assert.equal(readQueue({ clean: false }).length, 0, "looking does not count it");
  assert.equal(tickets(), 1, "and does not remove it");
  const lock = await acquireBrowserLock({ pollMs: 20 });
  assert.equal(browserLockStatus().holder?.pid, process.pid, "the oldest ticket was a ghost, so the lock was free to take");
  lock.release();
  assert.equal(tickets(), 0, "the ghost's file was removed by the first reader that cleaned");
});

test("a ticket silent for too long is cleared even if its pid exists", async () => {
  joinQueue(ticket({ token: "stuck", queuedAt: "2020-01-01T00:00:00.000Z" }));
  const old = new Date(Date.now() - 10 * 60_000);
  utimesSync(join(queueDir, readdirSync(queueDir)[0] as string), old, old);
  assert.deepEqual(readQueue({ clean: false }), []);
  const lock = await acquireBrowserLock({ pollMs: 20 });
  lock.release();
  assert.equal(tickets(), 0);
});

test("fake processes: a pid the check calls dead leaves the line", () => {
  joinQueue(ticket({ token: "a", pid: 1001, queuedAt: "2026-11-10T10:00:00.000Z" }));
  joinQueue(ticket({ token: "b", pid: 1002, queuedAt: "2026-11-10T10:01:00.000Z" }));
  joinQueue(ticket({ token: "c", pid: 1003, queuedAt: "2026-11-10T10:02:00.000Z" }));
  const order = (running: (pid: number) => boolean) => readQueue({ clean: false, alive: running }).map((one) => one.token);
  assert.deepEqual(order(() => true), ["a", "b", "c"]);
  assert.deepEqual(order((pid) => pid !== 1001), ["b", "c"]);
  assert.deepEqual(readQueue({ alive: (pid) => pid === 1003 }).map((one) => one.token), ["c"]);
  assert.equal(tickets(), 1, "the other two files were removed");
});

test("the queue order is the arrival order, and a tie goes to the lower pid", () => {
  const line = orderBrowserQueue([ticket({ token: "late", queuedAt: "2026-11-10T10:05:00.000Z" }), ticket({ token: "x2", pid: 9, queuedAt: "2026-11-10T10:00:00.000Z" }), ticket({ token: "x1", pid: 7, queuedAt: "2026-11-10T10:00:00.000Z" })]);
  assert.deepEqual(line.map((one) => one.token), ["x1", "x2", "late"]);
});

test("priority puts one waiter, the oldest from that folder, first", () => {
  const all = [ticket({ token: "a", cwd: "/p/a", queuedAt: "2026-11-10T10:00:00.000Z" }), ticket({ token: "b1", cwd: "/p/b", queuedAt: "2026-11-10T10:01:00.000Z" }), ticket({ token: "b2", cwd: "/p/b/sub", queuedAt: "2026-11-10T10:02:00.000Z" }), ticket({ token: "c", cwd: "/p/bb", queuedAt: "2026-11-10T10:03:00.000Z" })];
  assert.deepEqual(orderBrowserQueue(all, "/p/b").map((one) => one.token), ["b1", "a", "b2", "c"]);
  assert.deepEqual(orderBrowserQueue(all, "/p/nobody").map((one) => one.token), ["a", "b1", "b2", "c"]);
  assert.deepEqual(orderBrowserQueue(all, null).map((one) => one.token), ["a", "b1", "b2", "c"]);
});

test("priority makes a later waiter go first, once", async () => {
  const log = join(home, "priority.log");
  const holder = run(holding(60_000), {}, folder("holder"));
  await holder.printed("held");
  const first = waiter("early", log, folder("early"));
  await until(() => tickets() === 1);
  const second = waiter("urgent", log, folder("urgent"));
  await until(() => tickets() === 2);
  setBrowserPriority(folder("urgent"));
  assert.ok(readPriority()?.endsWith("/work/urgent"));
  holder.child.kill("SIGTERM");
  await Promise.all([holder.done, first.done, second.done]);
  assert.deepEqual(readFileSync(log, "utf8").trim().split("\n"), ["urgent", "early"]);
  assert.equal(existsSync(priorityPath), false, "spent when the waiter it named took the lock");
});

test("the command line sets and clears the priority and shows the queue", async () => {
  const command = (...args: string[]) => {
    const child = spawn(process.execPath, [cli, ...args], { env: env() });
    let out = "";
    child.stdout.on("data", (chunk: Buffer) => (out += chunk));
    child.stderr.on("data", (chunk: Buffer) => (out += chunk));
    return new Promise<{ code: number | null; out: string }>((resolve) => child.on("exit", (code) => resolve({ code, out })));
  };
  const holder = run(holding(60_000), { npm_lifecycle_event: "test:demo" }, folder("holder"));
  await holder.printed("held");
  const log = join(home, "cli.log");
  const one = waiter("one", log, folder("one"));
  await until(() => tickets() === 1);
  const two = waiter("two", log, folder("two"));
  await until(() => tickets() === 2);
  assert.equal((await command("first", folder("two"))).code, 0);
  const shown = (await command("status")).out;
  assert.match(shown, /held by holder test:demo, pid \d+, for 0 min/);
  assert.ok(shown.indexOf("1. two,") !== -1 && shown.indexOf("1. two,") < shown.indexOf("2. one,"), shown);
  assert.match(shown, /first by priority/);
  assert.equal(shown.includes("WARNING"), false);
  assert.equal((await command("first", "--clear")).code, 0);
  assert.equal(existsSync(priorityPath), false);
  assert.equal((await command("first")).code, 2);
  holder.child.kill("SIGTERM");
  await Promise.all([holder.done, one.done, two.done]);
});

test("the status warns when a holder has had the lock over 45 minutes, and only looks", () => {
  mkdirSync(join(cache, "kazoku-ui"), { recursive: true });
  const now = Date.now();
  const started = (minutes: number): string => new Date(now - minutes * 60_000).toISOString();
  const hold = (minutes: number): void => writeFileSync(file, JSON.stringify({ token: "h", pid: process.pid, repo: "hoshi-stars", cwd: "/p/hoshi-stars", command: "node /x/playwright test", script: "test:demo", startedAt: started(minutes) }));
  hold(44);
  assert.deepEqual(browserQueueStatus({ now }).warnings, []);
  hold(46);
  const long = browserQueueStatus({ now });
  assert.equal(long.heldMinutes, 46);
  assert.match(long.warnings[0] as string, /hoshi-stars test:demo has held the browser for 46 min \(over 45\)/);
  joinQueue(ticket({ token: "a", pid: 1, queuedAt: started(5) }));
  const seen = browserQueueStatus({ now, alive: () => false });
  assert.deepEqual(seen.queue, [], "a dead pid is not shown");
  assert.equal(tickets(), 1, "and looking removes nothing");
  const live = browserQueueStatus({ now, alive: () => true });
  assert.deepEqual(live.queue.map((one) => [one.place, one.ticket.token, one.waitedMinutes]), [[1, "a", 5]]);
});

test("KAZOKU_BROWSER_LOCK_DIR names another folder for the lock and the queue", async () => {
  const other = join(home, "elsewhere");
  process.env.KAZOKU_BROWSER_LOCK_DIR = other;
  try {
    assert.equal(browserLockStatus().file, join(other, "browser.lock"));
    const lock = await acquireBrowserLock({ pollMs: 20 });
    assert.equal(existsSync(join(other, "browser.lock")), true);
    assert.equal(existsSync(file), false, "the default place is untouched");
    lock.release();
  } finally {
    delete process.env.KAZOKU_BROWSER_LOCK_DIR;
  }
});

// ---- the older lock code, which has no queue ----

/** The old lock's take: a file hard-linked into place, tried every `pollMs` by whoever gets there first. */
const oldCode = (log: string, holdMs: number) => `
  import { linkSync, writeFileSync, rmSync, mkdirSync, appendFileSync } from "node:fs";
  import { join } from "node:path";
  import { homedir } from "node:os";
  const dir = join(process.platform === "darwin" ? join(homedir(), "Library", "Caches") : join(homedir(), ".cache"), "kazoku-ui");
  const file = join(dir, "browser.lock");
  mkdirSync(dir, { recursive: true });
  const draft = file + "." + process.pid + ".old";
  const holder = { token: "old-" + process.pid, pid: process.pid, repo: "oldpkg", cwd: process.cwd(), command: "old", startedAt: new Date().toISOString() };
  for (;;) {
    writeFileSync(draft, JSON.stringify(holder));
    try { linkSync(draft, file); rmSync(draft, { force: true }); break; } catch { rmSync(draft, { force: true }); }
    await new Promise((r) => setTimeout(r, 20));
  }
  console.log("held");
  appendFileSync(${JSON.stringify(log)}, "old\\n");
  await new Promise((r) => setTimeout(r, ${holdMs}));
  rmSync(file, { force: true });
`;

test("a run on the old lock code holds the lock and a queued run waits for it", async () => {
  const log = join(home, "compat1.log");
  const old = spawn(process.execPath, ["--input-type=module", "-e", oldCode(log, 600)], { env: env() });
  children.push(old);
  let out = "";
  old.stdout.on("data", (chunk: Buffer) => (out += chunk));
  await until(() => out.includes("held"));
  const mine = waiter("new", log, folder("new"));
  await mine.printed("waiting for the browser:");
  await Promise.all([mine.done, new Promise((r) => old.on("exit", r))]);
  assert.deepEqual(readFileSync(log, "utf8").trim().split("\n"), ["old", "new"]);
  assert.equal(existsSync(file), false);
});

test("a run on the old lock code waits for a queued run's lock and gets it after", async () => {
  const log = join(home, "compat2.log");
  const holder = run(`const l = await lock.acquireBrowserLock(); console.log("held"); await new Promise((r) => setTimeout(r, 800)); l.release();`, {}, folder("holder"));
  await holder.printed("held");
  const old = spawn(process.execPath, ["--input-type=module", "-e", oldCode(log, 50)], { env: env() });
  children.push(old);
  await Promise.all([holder.done, new Promise((r) => old.on("exit", r))]);
  assert.equal(readFileSync(log, "utf8").trim(), "old");
  assert.equal(existsSync(file), false);
});

test("a lock file nobody can read is cleared, and the queue goes on", async () => {
  mkdirSync(join(cache, "kazoku-ui"), { recursive: true });
  writeFileSync(file, "{not json");
  const lock = await acquireBrowserLock({ pollMs: 20 });
  assert.equal(browserLockStatus().holder?.pid, process.pid);
  lock.release();
});

test("a run without an npm script is named by its program and first words", () => {
  assert.equal(describeRun({ repo: "wakusei-planets", command: "/x/node_modules/@playwright/test/cli.js test --project=chromium-desk" }), "wakusei-planets playwright test");
  assert.equal(describeRun({ repo: "r", command: "/x/scripts/check.mjs --all", script: "test:demo" }), "r test:demo");
  assert.equal(describeRun({ repo: "r", command: "" }), "r");
});
