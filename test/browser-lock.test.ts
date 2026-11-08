import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, beforeEach, test } from "node:test";
import { pathToFileURL } from "node:url";
import { acquireBrowserLock, browserLockStatus, clearBrowserLock, withBrowserLock } from "../src/testing/index.ts";

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
  return clean;
};

before(() => {
  process.env.HOME = home;
  process.env.XDG_CACHE_HOME = join(home, ".cache");
  delete process.env.CI;
  delete process.env.KAZOKU_BROWSER_LOCK;
});

beforeEach(() => {
  rmSync(join(home, ".cache"), { recursive: true, force: true });
  rmSync(join(home, "Library"), { recursive: true, force: true });
});

after(() => {
  for (const child of children) child.kill("SIGKILL");
  process.env = saved;
  rmSync(home, { recursive: true, force: true });
});

/** A node process that runs `body` with `acquire` (the lock module's acquireBrowserLock) in scope, and lines it prints. */
function run(body: string, extra: NodeJS.ProcessEnv = {}) {
  const child = spawn(process.execPath, ["--input-type=module", "-e", `import * as lock from ${JSON.stringify(lockModule)};\n${body}`], { env: { ...env(), ...extra }, stdio: ["ignore", "pipe", "pipe"] });
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
  assert.match(second.output(), new RegExp(`waiting for the browser lock: held by .+ pid ${first.child.pid} since .+\\nran`));
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
    await stranger.printed("waiting for the browser lock");
    stranger.child.kill("SIGKILL");
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
