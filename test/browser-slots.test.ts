import assert from "node:assert/strict";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, beforeEach, test } from "node:test";
import { pathToFileURL } from "node:url";
import { ciImageArgs, ciImageSteps, parseCiImageArgs, removeOrphanContainers } from "../src/testing/ci-image.ts";
import { acquireBrowserLock, browserQueueStatus, browserSlotStatuses, browserSlots, ciImagePlan, clearBrowserLock, playwrightVersion } from "../src/testing/index.ts";
import { slotFile, slotsOf } from "../src/testing/slots.ts";
import { joinQueue, readQueue, type BrowserQueueTicket } from "../src/testing/queue.ts";

const lockModule = pathToFileURL(join(import.meta.dirname, "../src/testing/lock.ts")).href;
const cli = join(import.meta.dirname, "../src/testing/cli.ts");
const imageCli = join(import.meta.dirname, "../src/testing/ci-image-cli.ts");
const saved = { ...process.env };
const home = mkdtempSync(join(tmpdir(), "kazoku-slots-"));
const cache = process.platform === "darwin" ? join(home, "Library", "Caches") : join(home, ".cache");
const config = join(home, ".config", "kazoku-ui", "browser-slots.json");
const children: ChildProcess[] = [];

const env = (extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv => {
  const clean: NodeJS.ProcessEnv = { ...process.env, HOME: home, XDG_CACHE_HOME: join(home, ".cache"), ...extra };
  for (const key of ["CI", "KAZOKU_BROWSER_LOCK", "KAZOKU_BROWSER_LOCK_DIR", "KAZOKU_BROWSER_SLOTS_FILE", "npm_lifecycle_event"]) delete clean[key];
  return { ...clean, ...extra };
};
const slots = (native: number, image: number): void => {
  mkdirSync(join(home, ".config", "kazoku-ui"), { recursive: true });
  writeFileSync(config, JSON.stringify({ native, image }));
};

before(() => {
  process.env.HOME = home;
  process.env.XDG_CACHE_HOME = join(home, ".cache");
  for (const key of ["CI", "KAZOKU_BROWSER_LOCK", "KAZOKU_BROWSER_LOCK_DIR", "KAZOKU_BROWSER_SLOTS_FILE"]) delete process.env[key];
  assert.ok(slotFile("native", 0).startsWith(home), "these tests never touch the real lock");
});
beforeEach(() => {
  rmSync(join(home, ".cache"), { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
  rmSync(join(home, "Library"), { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
  rmSync(join(home, ".config"), { recursive: true, force: true });
});
after(() => {
  for (const child of children) child.kill("SIGKILL");
  process.env = saved;
  rmSync(home, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
});

function run(body: string, cwd?: string, extra: NodeJS.ProcessEnv = {}) {
  const child = spawn(process.execPath, ["--input-type=module", "-e", `import * as lock from ${JSON.stringify(lockModule)};\n${body}`], { env: env(extra), stdio: ["ignore", "pipe", "pipe"], ...(cwd ? { cwd } : {}) });
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
const folder = (name: string): string => {
  const dir = join(home, "work", name);
  mkdirSync(dir, { recursive: true });
  return dir;
};
/** A run that takes a slot of `kind`, prints "held" and keeps it until killed. */
const holder = (kind: "native" | "image", name: string) => run(`const l = await lock.acquireBrowserLock({ kind: ${JSON.stringify(kind)}, pollMs: 20 }); console.log("held"); await new Promise((r) => setTimeout(r, 60000)); l.release();`, folder(name));
/** A run that waits for a slot of `kind`, says "got-slot" when it has one and lets it go at once. */
const waiter = (kind: "native" | "image", name: string) => run(`const l = await lock.acquireBrowserLock({ kind: ${JSON.stringify(kind)}, pollMs: 20, reportMs: 100, log: console.log }); console.log("got-slot"); l.release();`, folder(name));
const until = async (ok: () => boolean, ms = 10_000): Promise<void> => {
  const started = Date.now();
  while (!ok()) {
    if (Date.now() - started > ms) throw new Error("timed out");
    await new Promise((r) => setTimeout(r, 20));
  }
};
const held = (kind: "native" | "image"): number => browserSlotStatuses().filter((slot) => slot.kind === kind && slot.holder).length;
const ticket = (over: Partial<BrowserQueueTicket>): BrowserQueueTicket => ({ token: "t", pid: process.pid, repo: "r", cwd: "/p/r", command: "c", queuedAt: "2026-11-10T10:00:00.000Z", ...over });

// ---- the machine's slots ----

test("a machine with no slots file has one native slot and no image slots", () => {
  assert.deepEqual(browserSlots(), { native: 1, image: 0 });
  assert.deepEqual(slotsOf("image"), []);
  assert.equal(slotsOf("native").length, 1);
  assert.equal(slotFile("native", 0), join(cache, "kazoku-ui", "browser.lock"), "the first native slot is the lock file it always was");
  assert.equal(slotFile("image", 1), join(cache, "kazoku-ui", "browser.image-2.lock"));
});

test("the slots file sets each kind, and a bad file or value falls back", () => {
  slots(1, 4);
  assert.deepEqual(browserSlots(), { native: 1, image: 4 });
  slots(0, 2.9);
  assert.deepEqual(browserSlots(), { native: 1, image: 2 }, "native is never below 1; a fraction is floored");
  mkdirSync(join(home, ".config", "kazoku-ui"), { recursive: true });
  writeFileSync(config, "{not json");
  assert.deepEqual(browserSlots(), { native: 1, image: 0 });
  writeFileSync(config, JSON.stringify({ native: "two", image: -3 }));
  assert.deepEqual(browserSlots(), { native: 1, image: 0 });
});

test("an image run on a machine with no image slots stops at once and says how to set them", async () => {
  await assert.rejects(acquireBrowserLock({ kind: "image" }), /no slots for runs in the CI image.*browser-slots\.json/);
});

// ---- the slots in use ----

test("two image runs hold two slots at once, and a third waits when the limit is 2", async () => {
  slots(1, 2);
  const one = holder("image", "one");
  await one.printed("held");
  const two = holder("image", "two");
  await two.printed("held");
  assert.equal(held("image"), 2, "both hold a slot together");
  assert.deepEqual(browserSlotStatuses().filter((slot) => slot.kind === "image").map((slot) => slot.holder?.kind), ["image", "image"]);
  const three = waiter("image", "three");
  await three.printed("waiting for an image slot: 1st in line, 2 of 2 slots held");
  assert.doesNotMatch(three.output(), /got-slot/, "the third is still waiting");
  one.child.kill("SIGTERM");
  await one.done;
  await three.printed("got-slot");
  assert.equal((await three.done).code, 0);
  assert.equal(held("image"), 1, "the second still holds its slot");
  two.child.kill("SIGTERM");
  await two.done;
  assert.equal(held("image"), 0);
});

test("a native run still waits for the native slot, and image runs do not block it nor it them", async () => {
  slots(1, 2);
  const native = holder("native", "native-one");
  await native.printed("held");
  const image = holder("image", "image-one");
  await image.printed("held");
  assert.equal(held("native"), 1);
  assert.equal(held("image"), 1);
  const second = waiter("native", "native-two");
  await second.printed("waiting for the browser: 1st in line");
  assert.doesNotMatch(second.output(), /got-slot/, "a free image slot does not let a second native run in");
  const imageToo = waiter("image", "image-two");
  await imageToo.printed("got-slot");
  assert.equal((await imageToo.done).code, 0, "a native run holding its slot does not hold up an image run");
  native.child.kill("SIGTERM");
  await native.done;
  await second.printed("got-slot");
  assert.equal((await second.done).code, 0);
  image.child.kill("SIGTERM");
  await image.done;
});

test("waiters of one kind are served in arrival order and each kind has its own line", async () => {
  slots(1, 1);
  const a = holder("image", "a");
  await a.printed("held");
  const first = waiter("image", "first");
  await until(() => readQueue({ kind: "image", clean: false }).length === 1);
  const second = waiter("image", "second");
  await until(() => readQueue({ kind: "image", clean: false }).length === 2);
  const status = browserQueueStatus();
  assert.deepEqual(status.queue.map((entry) => [entry.kind, entry.place, entry.ticket.repo]), [["image", 1, "first"], ["image", 2, "second"]]);
  assert.equal(readQueue({ kind: "native", clean: false }).length, 0, "no image waiter stands in the native line");
  a.child.kill("SIGTERM");
  await Promise.all([a.done, first.done, second.done]);
  assert.equal(held("image"), 0);
});

test("a dead holder's image slot is freed, and the next run takes it", async () => {
  slots(1, 2);
  const dead = run("");
  await dead.done;
  mkdirSync(join(cache, "kazoku-ui"), { recursive: true });
  const holderOf = (pid: number, token: string) => JSON.stringify({ token, pid, repo: "gone", cwd: "/", command: "x", kind: "image", slot: 0, startedAt: new Date().toISOString() });
  writeFileSync(slotFile("image", 0), holderOf(dead.child.pid as number, "old"));
  writeFileSync(slotFile("image", 1), holderOf(process.pid, "alive"));
  const [first, second] = browserSlotStatuses().filter((slot) => slot.kind === "image");
  assert.equal(first?.stale, true, "the dead holder's slot is stale");
  assert.equal(second?.stale, false);
  assert.match(browserQueueStatus().warnings.join("\n"), /image slot 1 is stale/);
  const lock = await acquireBrowserLock({ kind: "image", pollMs: 20 });
  assert.equal(browserSlotStatuses().find((slot) => slot.kind === "image" && slot.index === 0)?.holder?.pid, process.pid, "taken over");
  assert.equal(browserSlotStatuses().find((slot) => slot.kind === "image" && slot.index === 1)?.holder?.token, "alive", "the live holder's slot was left alone");
  lock.release();
  assert.equal(existsSync(slotFile("image", 0)), false);
});

test("a dead holder's native slot is freed as before, and clear reaches the image slots", async () => {
  slots(1, 1);
  const dead = run("");
  await dead.done;
  mkdirSync(join(cache, "kazoku-ui"), { recursive: true });
  writeFileSync(slotFile("image", 0), JSON.stringify({ token: "old", pid: dead.child.pid, repo: "gone", cwd: "/", command: "x", kind: "image", startedAt: new Date().toISOString() }));
  assert.equal(clearBrowserLock(), true);
  assert.equal(existsSync(slotFile("image", 0)), false);
  assert.equal(clearBrowserLock(), false);
});

test("an image ticket of a dead pid leaves the image line", async () => {
  slots(1, 1);
  const gone = run("");
  await gone.done;
  joinQueue(ticket({ token: "ghost", pid: gone.child.pid as number, kind: "image", queuedAt: "2020-01-01T00:00:00.000Z" }));
  assert.equal(readQueue({ kind: "image" }).length, 0);
  const lock = await acquireBrowserLock({ kind: "image", pollMs: 20 });
  lock.release();
});

test("a child that inherits an image token runs under it, but a native run does not", async () => {
  slots(1, 1);
  const lock = await acquireBrowserLock({ kind: "image", pollMs: 20 });
  try {
    const token = process.env.KAZOKU_BROWSER_LOCK;
    assert.ok(token);
    const same = run(`const l = await lock.acquireBrowserLock({ kind: "image", pollMs: 20, reportMs: 20, log: console.log }); console.log("entered"); l.release();`, undefined, { KAZOKU_BROWSER_LOCK: token });
    assert.equal((await same.done).code, 0);
    assert.equal(same.output().includes("waiting"), false, same.output());
    assert.equal(held("image"), 1, "the child's release left the parent's slot alone");
    const other = run(`const l = await lock.acquireBrowserLock({ pollMs: 20 }); console.log("held"); await new Promise((r) => setTimeout(r, 60000)); l.release();`, undefined, { KAZOKU_BROWSER_LOCK: token });
    await other.printed("held");
    assert.equal(held("native"), 1, "an image token is no pass for the native slot");
    other.child.kill("SIGKILL");
    await other.done;
  } finally {
    lock.release();
  }
});

// ---- the command line ----

const command = (args: string[], extra: NodeJS.ProcessEnv = {}, cwd?: string, file = cli) =>
  new Promise<{ code: number | null; out: string }>((resolve) => {
    const child = spawn(process.execPath, [file, ...args], { env: env(extra), ...(cwd ? { cwd } : {}) });
    let out = "";
    child.stdout.on("data", (chunk: Buffer) => (out += chunk));
    child.stderr.on("data", (chunk: Buffer) => (out += chunk));
    child.on("exit", (code) => resolve({ code, out }));
  });

test("status shows each slot and its holder, and says when no image slots are set up", async () => {
  const none = await command(["status"]);
  assert.equal(none.code, 0);
  assert.match(none.out, /the browser is free/);
  assert.match(none.out, /image slots: none set up on this machine/);
  slots(1, 2);
  const a = holder("image", "alpha");
  await a.printed("held");
  const shown = await command(["status"]);
  assert.equal(shown.code, 0, "an image run does not make the machine's own browser busy");
  assert.match(shown.out, /the browser is free/);
  assert.match(shown.out, /image slots: 1 of 2 in use/);
  assert.match(shown.out, new RegExp(`image slot 1 is held by alpha, pid ${a.child.pid}, for 0 min`));
  assert.match(shown.out, /image slot 2 is free/);
  const b = holder("native", "beta");
  await b.printed("held");
  const both = await command(["status"]);
  assert.equal(both.code, 1, "a native holder makes status exit 1, as before");
  assert.match(both.out, /the browser is held by beta/);
  a.child.kill("SIGKILL");
  b.child.kill("SIGKILL");
  await Promise.all([a.done, b.done]);
});

test("first works per kind: --image sets and clears the image line's priority only", async () => {
  slots(1, 1);
  const h = holder("image", "h");
  await h.printed("held");
  const early = waiter("image", "early");
  await until(() => readQueue({ kind: "image", clean: false }).length === 1);
  const urgent = waiter("image", "urgent");
  await until(() => readQueue({ kind: "image", clean: false }).length === 2);
  assert.equal((await command(["first", folder("urgent"), "--image"])).code, 0);
  assert.equal(existsSync(join(cache, "kazoku-ui", "priority")), false, "the native priority is not touched");
  assert.equal(existsSync(join(cache, "kazoku-ui", "priority-image")), true);
  const shown = (await command(["status"])).out;
  assert.ok(shown.indexOf("1. urgent,") !== -1 && shown.indexOf("1. urgent,") < shown.indexOf("2. early,"), shown);
  assert.match(shown, /first by priority/);
  h.child.kill("SIGTERM");
  await Promise.all([h.done, early.done, urgent.done]);
  assert.equal(existsSync(join(cache, "kazoku-ui", "priority-image")), false, "spent when the waiter it named took a slot");
  assert.equal((await command(["first", "--clear", "--image"])).code, 0);
});

// ---- the command that runs Playwright in the image ----

const lockfile = readFileSync(join(import.meta.dirname, "../pnpm-lock.yaml"), "utf8");

test("the image's version comes from the lockfile", () => {
  const version = playwrightVersion(lockfile);
  assert.match(version ?? "", /^\d+\.\d+\.\d+$/);
  assert.equal(playwrightVersion("importers:\n  .:\n    devDependencies:\n      '@playwright/test':\n        specifier: ^1.63.0\n        version: 1.64.1(peer@1)\n"), "1.64.1");
  assert.equal(playwrightVersion("packages:\n\n  '@playwright/test@1.60.2':\n    resolution: {}\n"), "1.60.2");
  assert.equal(playwrightVersion('{"packages": {"node_modules/@playwright/test": {\n "version": "1.59.0",'), "1.59.0");
  assert.equal(playwrightVersion('"@playwright/test@^1.50.0":\n  version "1.58.1"\n'), "1.58.1");
  assert.equal(playwrightVersion("importers: {}"), null);
});

test("the plan: image, fences, install and build as CI does, and Playwright's own arguments", () => {
  const repo = join(import.meta.dirname, "..");
  const plan = ciImagePlan({ repo, args: ["e2e/a.demo.mjs", "--project=chromium-desk"], cpus: 3, memory: "8g" });
  assert.equal(plan.image, `mcr.microsoft.com/playwright:v${playwrightVersion(lockfile)}-noble`);
  assert.deepEqual(plan.steps, ["pnpm install --frozen-lockfile --store-dir /cache/pnpm-store", "pnpm site"], "this package's site script builds first, so `pnpm build` is not run twice");
  assert.deepEqual(plan.args, ["test", "e2e/a.demo.mjs", "--project=chromium-desk", "--workers=2"]);
  assert.match(plan.script, /npm install -g .*pnpm@10\.11\.0/);
  assert.match(plan.script, /pnpm exec playwright "\$@"/);
  assert.throws(() => ciImagePlan({ repo, args: [], cpus: 0 }), /--cpus/);
  assert.throws(() => ciImagePlan({ repo, args: [], memory: "lots" }), /--memory/);
  assert.throws(() => ciImagePlan({ repo: tmpdir(), args: [] }), /no pnpm-lock\.yaml or package-lock\.json/);
});

test("steps and arguments follow the repo's scripts and the command named", () => {
  assert.deepEqual(ciImageSteps({ scripts: { build: "tsc", site: "node scripts/site.mjs" } }, "pnpm"), ["pnpm install --frozen-lockfile --store-dir /cache/pnpm-store", "pnpm build", "pnpm site"]);
  assert.deepEqual(ciImageSteps({ scripts: { build: "tsc" } }, "pnpm"), ["pnpm install --frozen-lockfile --store-dir /cache/pnpm-store", "pnpm build"]);
  assert.deepEqual(ciImageSteps({}, "npm"), ["npm ci --cache /cache/npm"]);
  assert.deepEqual(ciImageSteps({ scripts: { build: "tsc" } }, "pnpm", "make all"), ["pnpm install --frozen-lockfile --store-dir /cache/pnpm-store", "make all"], "--setup replaces the build");
  assert.deepEqual(ciImageArgs([], 3), ["test", "--workers=2"]);
  assert.deepEqual(ciImageArgs(["test", "--workers=1"], 3), ["test", "--workers=1"], "a worker count of the caller's is kept");
  assert.deepEqual(ciImageArgs(["show-report"], 3), ["show-report"], "a Playwright command other than test is left alone");
  assert.deepEqual(ciImageArgs(["--project=webkit-desk"], 4), ["test", "--project=webkit-desk", "--workers=2"]);
});

test("the command line: options before `--`, Playwright's arguments after", () => {
  assert.deepEqual(parseCiImageArgs(["--cpus", "2", "--memory=4g", "--", "test", "--project=a"]), { args: ["test", "--project=a"], help: false, cpus: 2, memory: "4g" });
  assert.deepEqual(parseCiImageArgs(["--dry-run", "test", "x.mjs"]), { args: ["test", "x.mjs"], help: false, dryRun: true }, "the first word that is not an option starts Playwright's");
  assert.deepEqual(parseCiImageArgs(["--setup", "make", "--node", "24", "--", "--grep", "a"]).args, ["--grep", "a"]);
  assert.throws(() => parseCiImageArgs(["--cpus"]), /--cpus needs a value/);
  assert.equal(parseCiImageArgs(["--help"]).help, true);
});

/** A stand-in for `docker` that logs what it is asked and answers like the real one. FAKE_INFO and FAKE_CODE steer it. */
function fakeDocker(): { bin: string; log: string } {
  const dir = mkdtempSync(join(home, "fake-docker-"));
  const log = join(dir, "calls.log");
  const bin = join(dir, "docker");
  writeFileSync(
    bin,
    `#!/bin/sh
echo "$@" >> ${JSON.stringify(log)}
case "$1" in
  info) exit \${FAKE_INFO:-0} ;;
  ps) [ -n "$FAKE_ORPHAN" ] && echo "deadbeef 999999" ; exit 0 ;;
  cp) if [ "$2" = "-" ]; then cat > ${JSON.stringify(join(dir, "stdin.tar"))}; fi; exit 0 ;;
  start) echo "==> fake playwright"; exit \${FAKE_CODE:-0} ;;
  *) exit 0 ;;
esac
`,
  );
  chmodSync(bin, 0o755);
  return { bin, log };
}

function fakeRepo(): string {
  const repo = mkdtempSync(join(home, "repo-"));
  writeFileSync(join(repo, "package.json"), JSON.stringify({ name: "x", scripts: { build: "true" }, packageManager: "pnpm@10.11.0" }));
  writeFileSync(join(repo, "pnpm-lock.yaml"), "importers:\n  .:\n    devDependencies:\n      '@playwright/test':\n        specifier: ^1.63.0\n        version: 1.64.1\n");
  mkdirSync(join(repo, "node_modules"));
  writeFileSync(join(repo, "node_modules", "mac.node"), "mac only");
  writeFileSync(join(repo, "spec.mjs"), "x");
  return repo;
}

test("kazoku-ci-image says plainly when Docker is not running, and takes no slot", async () => {
  slots(1, 1);
  const { bin, log } = fakeDocker();
  const repo = fakeRepo();
  const result = await command(["--", "test"], { KAZOKU_DOCKER: bin, FAKE_INFO: "1" }, repo, imageCli);
  assert.equal(result.code, 3);
  assert.match(result.out, /Docker is not running\. Start Docker Desktop/);
  assert.equal(held("image"), 0);
  assert.doesNotMatch(readFileSync(log, "utf8"), /create/);
  const missing = await command(["--", "test"], { KAZOKU_DOCKER: join(home, "no-such-docker") }, repo, imageCli);
  assert.equal(missing.code, 3);
  assert.match(missing.out, /Docker is not installed/);
});

test("kazoku-ci-image stops on a machine with no image slots", async () => {
  const { bin } = fakeDocker();
  const result = await command(["--", "test"], { KAZOKU_DOCKER: bin }, fakeRepo(), imageCli);
  assert.equal(result.code, 2);
  assert.match(result.out, /no slots for runs in the CI image/);
});

test("kazoku-ci-image creates a fenced container, holds a slot while it runs, returns Playwright's exit code and removes the container", async () => {
  slots(1, 2);
  const { bin, log } = fakeDocker();
  const repo = fakeRepo();
  const result = await command(["--cpus", "2", "--memory", "4g", "--", "test", "spec.mjs", "--project=chromium-desk"], { KAZOKU_DOCKER: bin, FAKE_CODE: "7", FAKE_ORPHAN: "1" }, repo, imageCli);
  assert.equal(result.code, 7, result.out);
  const calls = readFileSync(log, "utf8");
  const create = calls.slice(calls.indexOf("create "), calls.indexOf("\ncp - "));
  assert.match(create, /--cpus 2 --memory 4g --memory-swap 4g/);
  assert.match(create, /--ipc=host/);
  assert.match(create, /-e CI=true/);
  assert.match(create, /mcr\.microsoft\.com\/playwright:v1\.64\.1-noble bash -c /);
  assert.match(create, / -- test spec\.mjs --project=chromium-desk --workers=1$/);
  assert.doesNotMatch(create, /-v [^ ]*:\/work|node_modules/, "the repo is copied in, never bind-mounted");
  assert.match(calls, /^cp - kazoku-ci-\d+-\w+:\/work$/m);
  assert.match(calls, /^rm -f -v deadbeef$/m, "a container left by a killed run was removed");
  assert.match(calls, /^rm -f -v kazoku-ci-\d+-\w+$/m, "and the run's own is removed at the end");
  assert.match(calls, /^cp kazoku-ci-\d+-\w+:\/work\/test-results\/\. .*test-results\/ci-image\/\d{8}-\d{6}-\d+\/test-results$/m, "the results are copied out, into a folder of this run's own");
  assert.match(result.out, /playwright exited with 7/);
  assert.equal(held("image"), 0, "the slot is let go");
});

test("kazoku-ci-image waits for a slot when they are all held", async () => {
  slots(1, 1);
  const h = holder("image", "busy");
  await h.printed("held");
  const { bin } = fakeDocker();
  const child = spawn(process.execPath, [imageCli, "--", "test"], { env: env({ KAZOKU_DOCKER: bin }), cwd: fakeRepo() });
  children.push(child);
  let out = "";
  child.stderr.on("data", (chunk: Buffer) => (out += chunk));
  await until(() => readQueue({ kind: "image", clean: false }).length === 1);
  assert.equal(out.includes("starting"), false);
  h.child.kill("SIGTERM");
  await new Promise((r) => child.on("exit", r));
  assert.match(out, /starting/);
});

test("kazoku-ci-image --dry-run prints the plan and runs nothing", async () => {
  slots(1, 1);
  const { bin, log } = fakeDocker();
  const result = await command(["--dry-run", "--", "test", "spec.mjs"], { KAZOKU_DOCKER: bin }, fakeRepo(), imageCli);
  assert.equal(result.code, 0);
  assert.match(result.out, /image: mcr\.microsoft\.com\/playwright:v1\.64\.1-noble/);
  assert.match(result.out, /pnpm install --frozen-lockfile/);
  assert.equal(existsSync(log), false, "docker was not called");
});

test("an old-style native ticket gets the free lock while an older image ticket waits: the two kinds have their own queue folders", async () => {
  slots(1, 1);
  joinQueue(ticket({ token: "image-ahead", kind: "image", queuedAt: "2020-01-01T00:00:00.000Z" }));
  const nativeNames = existsSync(join(cache, "kazoku-ui", "queue")) ? readdirSync(join(cache, "kazoku-ui", "queue")) : [];
  assert.deepEqual(nativeNames, [], "the image ticket is not in the folder a run on an older kazoku-ui reads");
  assert.equal(readdirSync(join(cache, "kazoku-ui", "queue-image")).filter((name) => name.endsWith(".json")).length, 1);
  // What a run on the older code writes: a native ticket with no kind, newer than the image ticket.
  const old = run(`const l = await lock.acquireBrowserLock({ pollMs: 20 }); console.log("got-slot"); await new Promise((r) => setTimeout(r, 60000)); l.release();`, folder("old-style"));
  await old.printed("got-slot");
  assert.equal(held("native"), 1, "the native run took the free lock at once");
  const written = readdirSync(join(cache, "kazoku-ui", "queue"));
  assert.deepEqual(written, [], "its ticket went when it took the lock");
  joinQueue(ticket({ token: "legacy", pid: process.pid, queuedAt: "2026-11-10T10:00:00.000Z" }));
  const legacy = readdirSync(join(cache, "kazoku-ui", "queue")).map((name) => JSON.parse(readFileSync(join(cache, "kazoku-ui", "queue", name), "utf8")) as BrowserQueueTicket);
  assert.equal(legacy[0]?.kind, undefined, "a native ticket carries no kind, as before");
  assert.deepEqual(readQueue({ kind: "native", clean: false }).map((one) => one.token), ["legacy"], "an image ticket is not ahead of it");
  assert.deepEqual(readQueue({ kind: "image", clean: false }).map((one) => one.token), ["image-ahead"]);
  assert.deepEqual(readQueue({ clean: false }).map((one) => one.token), ["legacy", "image-ahead"], "without a kind: the native line, then the image line");
  old.child.kill("SIGKILL");
  await old.done;
});

test("when the image count is lowered under a held high slot, that slot still counts against the limit", async () => {
  slots(1, 4);
  mkdirSync(join(cache, "kazoku-ui"), { recursive: true });
  writeFileSync(slotFile("image", 3), JSON.stringify({ token: "high", pid: process.pid, repo: "high", cwd: "/", command: "x", kind: "image", slot: 3, startedAt: new Date().toISOString() }));
  slots(1, 2);
  assert.equal(slotsOf("image").length, 4, "the held slot above the limit is still looked at");
  const one = holder("image", "one");
  await one.printed("held");
  const two = waiter("image", "two");
  await two.printed("waiting for an image slot: 1st in line, 2 of 2 slots held");
  assert.doesNotMatch(two.output(), /got-slot/, "the third would be a third run under a limit of 2");
  rmSync(slotFile("image", 3));
  await two.printed("got-slot");
  assert.equal((await two.done).code, 0);
  one.child.kill("SIGKILL");
  await one.done;
});

test("kazoku-ci-image leaves .env files and ignored files out of the copy, in a git repo and without one", async () => {
  slots(1, 1);
  const { bin } = fakeDocker();
  const dir = join(bin, "..");
  const list = async (repo: string): Promise<string[]> => {
    const result = await command(["--", "test"], { KAZOKU_DOCKER: bin }, repo, imageCli);
    assert.equal(result.code, 0, result.out);
    return await new Promise<string[]>((resolve) => {
      const lister = spawn("tar", ["-tf", join(dir, "stdin.tar")]);
      let out = "";
      lister.stdout.on("data", (chunk: Buffer) => (out += chunk));
      lister.on("exit", () => resolve(out.split("\n").map((name) => name.replace(/^\.\//, "")).filter((name) => name && !name.endsWith("/"))));
    });
  };
  const plain = fakeRepo();
  writeFileSync(join(plain, ".env"), "SECRET=1");
  mkdirSync(join(plain, "sub"));
  writeFileSync(join(plain, "sub", ".env.local"), "SECRET=2");
  const files = await list(plain);
  assert.deepEqual(files.filter((name) => name.includes(".env") || name.includes("node_modules")), []);
  assert.ok(files.includes("spec.mjs"));
  const repo = fakeRepo();
  writeFileSync(join(repo, ".gitignore"), "ignored.txt\nnode_modules/\n");
  writeFileSync(join(repo, "ignored.txt"), "x");
  writeFileSync(join(repo, ".env.production"), "SECRET=3");
  writeFileSync(join(repo, "untracked.mjs"), "x");
  const git = (...args: string[]) => spawnSync("git", ["-C", repo, "-c", "user.name=t", "-c", "user.email=t@example.com", ...args], { encoding: "utf8" });
  git("init", "-q");
  git("add", "package.json", "pnpm-lock.yaml", "spec.mjs", ".gitignore");
  git("commit", "-q", "-m", "x");
  const gitFiles = (await list(repo)).sort();
  assert.deepEqual(gitFiles, [".gitignore", "package.json", "pnpm-lock.yaml", "spec.mjs", "untracked.mjs"]);
});

test("kazoku-ci-image stops, and says so, when the tar of the repo fails, rather than run on half a copy", async () => {
  slots(1, 1);
  const { bin, log } = fakeDocker();
  const repo = fakeRepo();
  writeFileSync(join(repo, "locked.txt"), "x");
  chmodSync(join(repo, "locked.txt"), 0o000);
  try {
    const result = await command(["--", "test"], { KAZOKU_DOCKER: bin }, repo, imageCli);
    assert.equal(result.code, 1, result.out);
    assert.match(result.out, /could not copy the repo into the container: tar failed/);
    assert.doesNotMatch(readFileSync(log, "utf8"), /^start /m, "the container never started");
    assert.match(readFileSync(log, "utf8"), /^rm -f -v kazoku-ci-/m, "and was removed");
  } finally {
    chmodSync(join(repo, "locked.txt"), 0o644);
  }
});

test("two runs of one repo copy their results to folders of their own", async () => {
  slots(1, 2);
  const { bin, log } = fakeDocker();
  const repo = fakeRepo();
  await Promise.all([command(["--", "test"], { KAZOKU_DOCKER: bin }, repo, imageCli), command(["--", "test"], { KAZOKU_DOCKER: bin }, repo, imageCli)]);
  const dests = [...readFileSync(log, "utf8").matchAll(/^cp kazoku-ci-\S+:\/work\/test-results\/\. (\S+)$/gm)].map((match) => match[1]);
  assert.equal(dests.length, 2);
  assert.notEqual(dests[0], dests[1]);
});

test("removeOrphanContainers removes only containers whose run is gone", () => {
  const calls: string[][] = [];
  const fake = (args: readonly string[]) => {
    calls.push([...args]);
    return { status: 0, stdout: args[0] === "ps" ? "aaa 100\nbbb 200\ncc 5x\n" : "", stderr: "", pid: 0, output: [], signal: null };
  };
  assert.equal(removeOrphanContainers(fake, (pid) => pid === 100), 1);
  assert.deepEqual(calls.filter((call) => call[0] === "rm"), [["rm", "-f", "-v", "bbb"]]);
});
