/// <reference types="node" />
import { spawn, spawnSync, type SpawnSyncReturns } from "node:child_process";
import { closeSync, existsSync, lstatSync, mkdirSync, mkdtempSync, openSync, readdirSync, readFileSync, rmSync, rmdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import process from "node:process";
import { acquireBrowserLock, type BrowserLock, type BrowserLockOptions } from "./lock.ts";
import { alive } from "./queue.ts";
import { slotsFile } from "./slots.ts";

/** The label every container this command makes carries, with the pid of the run that made it, so a container whose run was killed can be found and removed. */
const LABEL = "kazoku-ci-image";
/** The named volume the runs share: the package store, so an install in the second run copies from disk instead of downloading. Safe to remove; the next run fills it. */
const CACHE_VOLUME = "kazoku-ci-cache";
const PLAYWRIGHT_COMMANDS = new Set(["test", "install", "install-deps", "codegen", "show-report", "show-trace", "merge-reports", "clear-cache", "test-server", "init-agents"]);

/** What one run in the CI image is asked to do. */
export interface CiImageOptions {
  /** The folder of the repo. The current folder. */
  repo?: string;
  /** CPUs the container may use (`docker --cpus`). 3. */
  cpus?: number;
  /** The container's memory, swap included (`docker --memory`, so `8g`, `4096m`). 8g. */
  memory?: string;
  /** Playwright's own arguments: `["test", "e2e/a.demo.mjs", "--project=chromium-desk"]`. A first word that is not a Playwright command means `test`. */
  args: readonly string[];
  /** The folder the container's `test-results` and `playwright-report` are copied into. By default a folder of its own for each run, `test-results/ci-image/<time>-<pid>` in the repo (the newest ten are kept), so runs side by side never overwrite each other. */
  out?: string;
  /** Shell commands that replace the default build (`pnpm build`, then `pnpm site` when there is a `site` script). The install always runs first. */
  setup?: string;
  /** A Node major to put in the container (`24`, as CI's `setup-node` has), else the image's own Node. */
  node?: string;
  /** Show the plan (image, the container's options and its script) and run nothing. */
  dryRun?: boolean;
  /** Where progress goes. Standard error. */
  log?: (line: string) => void;
  /** Passed to the slot lock (a test sets `pollMs`). */
  lock?: Pick<BrowserLockOptions, "pollMs" | "reportMs" | "maxAgeMs">;
}

/** Everything the command works out before it touches Docker. */
export interface CiImagePlan {
  /** The image: `mcr.microsoft.com/playwright:v<version>-noble`. */
  image: string;
  /** The `@playwright/test` version in the lockfile. */
  playwright: string;
  cpus: number;
  memory: string;
  /** The package manager the lockfile belongs to. */
  manager: "pnpm" | "npm";
  /** The commands run in the container before Playwright, in order. */
  steps: string[];
  /** The Playwright arguments, with `test` and `--workers` filled in. */
  args: string[];
  /** The shell script the container runs (the Playwright arguments reach it as `"$@"`). */
  script: string;
}

/**
 * The `@playwright/test` version a lockfile pins, or null. Reads `pnpm-lock.yaml`, `package-lock.json` and `yarn.lock`.
 *
 * @example
 * playwrightVersion("importers:\n  .:\n    devDependencies:\n      '@playwright/test':\n        specifier: ^1.63.0\n        version: 1.64.1\n"); // "1.64.1"
 */
export function playwrightVersion(lockfile: string): string | null {
  const pnpm = /^\s+'?@playwright\/test'?:\s*\n\s+specifier: .*\n\s+version: (\d+\.\d+\.\d+[^\s(]*)/m.exec(lockfile) ?? /^\s*'?@playwright\/test@(\d+\.\d+\.\d+[^\s':(]*)/m.exec(lockfile);
  if (pnpm?.[1]) return pnpm[1];
  const npm = /"node_modules\/@playwright\/test":\s*\{\s*"version":\s*"(\d+\.\d+\.\d+[^"]*)"/.exec(lockfile);
  if (npm?.[1]) return npm[1];
  const yarn = /^"?@playwright\/test@[^\n]*:\n\s+version:? "?(\d+\.\d+\.\d+[^"\n]*)/m.exec(lockfile);
  return yarn?.[1] ?? null;
}

/** Playwright's image for a version: its browsers, their system libraries and its fonts, as CI's job runs in. */
export const ciImageName = (version: string): string => `mcr.microsoft.com/playwright:v${version}-noble`;

/**
 * What the container runs before Playwright. The lockfile's install, then `pnpm build` and, when there is a `site` script, `pnpm site` (that script's own build step is not run
 * twice). `setup` replaces the build steps.
 *
 * @example
 * ciImageSteps({ scripts: { build: "tsc", site: "pnpm build && node scripts/site.mjs" } }, "pnpm"); // ["pnpm install --frozen-lockfile ...", "pnpm site"]
 */
export function ciImageSteps(pkg: { scripts?: Record<string, string> }, manager: "pnpm" | "npm", setup?: string): string[] {
  const run = manager === "pnpm" ? "pnpm" : "npm run";
  const install = manager === "pnpm" ? "pnpm install --frozen-lockfile --store-dir /cache/pnpm-store" : "npm ci --cache /cache/npm";
  if (setup) return [install, setup];
  const scripts = pkg.scripts ?? {};
  const steps = [install];
  const siteBuilds = scripts.site !== undefined && /\b(?:pnpm|npm run|yarn) build\b/.test(scripts.site);
  if (scripts.build !== undefined && !siteBuilds) steps.push(`${run} build`);
  if (scripts.site !== undefined) steps.push(`${run} site`);
  return steps;
}

/** Playwright's arguments as they are run: `test` first unless a Playwright command is named, and as many workers as half the container's CPUs unless `--workers` is given. */
export function ciImageArgs(args: readonly string[], cpus: number): string[] {
  const full = args.length === 0 || !PLAYWRIGHT_COMMANDS.has(args[0] as string) ? ["test", ...args] : [...args];
  if (full[0] === "test" && !full.some((word) => word === "--workers" || word.startsWith("--workers=") || word === "-j" || word.startsWith("-j"))) full.push(`--workers=${Math.max(1, Math.round(cpus / 2))}`);
  return full;
}

const quote = (text: string): string => `'${text.replace(/'/g, `'\\''`)}'`;

/**
 * The plan for one run: the image, the fences, the commands and the script, worked out from the repo's lockfile, `package.json` and the options. It reads files and nothing else.
 * Throws with a plain sentence when the repo has no lockfile that names `@playwright/test`.
 *
 * @example
 * const { image, steps } = ciImagePlan({ args: ["test", "e2e/a.demo.mjs", "--project=chromium-desk"] });
 * console.log(image); // mcr.microsoft.com/playwright:v1.64.1-noble
 */
export function ciImagePlan(options: CiImageOptions): CiImagePlan {
  const repo = resolve(options.repo ?? process.cwd());
  const cpus = options.cpus ?? 3;
  const memory = options.memory ?? "8g";
  if (!(cpus > 0) || cpus > 256) throw new Error(`--cpus must be a number above 0, not ${cpus}`);
  if (!/^\d+(?:\.\d+)?[bkmg]?$/i.test(memory)) throw new Error(`--memory must be like 8g or 4096m, not ${memory}`);
  if (options.node !== undefined && !/^\d+(?:\.\d+){0,2}$/.test(options.node)) throw new Error(`--node must be a version like 24, not ${options.node}`);
  const read = (name: string): string | null => (existsSync(join(repo, name)) ? readFileSync(join(repo, name), "utf8") : null);
  const manager = existsSync(join(repo, "pnpm-lock.yaml")) ? "pnpm" : existsSync(join(repo, "package-lock.json")) ? "npm" : null;
  if (!manager) throw new Error(`${repo} has no pnpm-lock.yaml or package-lock.json: the version of @playwright/test, and so the image, comes from the lockfile`);
  const playwright = playwrightVersion(read(manager === "pnpm" ? "pnpm-lock.yaml" : "package-lock.json") ?? "");
  if (!playwright) throw new Error(`the lockfile in ${repo} does not name @playwright/test, so there is no image to pick`);
  const pkg = JSON.parse(read("package.json") ?? "{}") as { scripts?: Record<string, string>; packageManager?: string };
  const steps = ciImageSteps(pkg, manager, options.setup);
  const args = ciImageArgs(options.args, cpus);
  const pnpmVersion = /^pnpm@(\d+\.\d+\.\d+)/.exec(pkg.packageManager ?? "")?.[1] ?? "latest";
  const lines = [
    "set -eu",
    'step() { echo; echo "==> $* [$(date +%H:%M:%S)]"; }',
    "cd /work",
    ...(options.node ? [`step ${quote(`Node ${options.node} (CI's setup-node)`)}`, `npm install -g --cache /cache/npm node@${options.node} >/dev/null`, "hash -r", "node --version"] : []),
    ...(manager === "pnpm" ? [`step ${quote(`pnpm ${pnpmVersion}`)}`, `npm install -g --cache /cache/npm pnpm@${pnpmVersion} >/dev/null`, "pnpm --version"] : []),
    ...steps.flatMap((step) => [`step ${quote(step)}`, step]),
    `step ${quote(`${manager === "pnpm" ? "pnpm exec" : "npx"} playwright "$@"`)}`,
    "set +e",
    `${manager === "pnpm" ? "pnpm exec" : "npx"} playwright "$@"`,
    "code=$?",
    'step "playwright exited with $code"',
    "exit $code",
  ];
  return { image: ciImageName(playwright), playwright, cpus, memory, manager, steps, args, script: lines.join("\n") };
}

/** The arguments of `docker create` for a plan. */
export function ciImageDockerArgs(plan: CiImagePlan, name: string, pid: number): string[] {
  return [
    "create",
    "--name", name,
    "--label", `${LABEL}=${pid}`,
    "--init",
    "--ipc=host",
    "--cpus", String(plan.cpus),
    "--memory", plan.memory,
    "--memory-swap", plan.memory,
    "-w", "/work",
    "-v", `${CACHE_VOLUME}:/cache`,
    "-e", "CI=true",
    "-e", "PLAYWRIGHT_HTML_OPEN=never",
    plan.image,
    "bash", "-c", plan.script, "--", ...plan.args,
  ];
}

/** What a command line asks for. */
export interface CiImageCommandLine extends Omit<CiImageOptions, "args"> {
  args: string[];
  help: boolean;
}

/**
 * The command line of `kazoku-ci-image`: `[--cpus 3] [--memory 8g] [--out dir] [--setup "cmd"] [--node 24] [--dry-run] [--] <playwright arguments>`. Everything after `--`, or from
 * the first word that is not one of these options, is Playwright's. Throws with a plain sentence for an option it does not know.
 *
 * @example
 * parseCiImageArgs(["--cpus", "2", "--", "test", "e2e/a.demo.mjs"]); // { cpus: 2, args: ["test", "e2e/a.demo.mjs"], help: false }
 */
export function parseCiImageArgs(argv: readonly string[]): CiImageCommandLine {
  const out: CiImageCommandLine = { args: [], help: false };
  const value = (flag: string, at: number): string => {
    const next = argv[at + 1];
    if (next === undefined) throw new Error(`${flag} needs a value`);
    return next;
  };
  for (let i = 0; i < argv.length; i++) {
    const word = argv[i] as string;
    const [flag, joined] = word.startsWith("--") && word.includes("=") ? [word.slice(0, word.indexOf("=")), word.slice(word.indexOf("=") + 1)] : [word, undefined];
    const take = (): string => {
      if (joined !== undefined) return joined;
      i++;
      return value(flag, i - 1);
    };
    if (word === "--") {
      out.args = argv.slice(i + 1) as string[];
      break;
    } else if (flag === "--cpus") out.cpus = Number(take());
    else if (flag === "--memory") out.memory = take();
    else if (flag === "--out") out.out = take();
    else if (flag === "--setup") out.setup = take();
    else if (flag === "--node") out.node = take();
    else if (flag === "--repo") out.repo = take();
    else if (word === "--dry-run") out.dryRun = true;
    else if (word === "--help" || word === "-h") out.help = true;
    else {
      out.args = argv.slice(i) as string[];
      break;
    }
  }
  return out;
}

export const CI_IMAGE_USAGE = `usage: kazoku-ci-image [--cpus 3] [--memory 8g] [--out dir] [--setup "cmd"] [--node 24] [--dry-run] -- <playwright arguments>
  runs Playwright in the image CI runs in (mcr.microsoft.com/playwright:v<version>-noble, the version in the lockfile), in a container fenced to --cpus and --memory,
  after installing from the lockfile and building (pnpm build, and pnpm site when there is a site script; --setup "cmd" replaces the build).
  It takes one of the machine's image slots first (${slotsFile()}); with none set up it stops. The container's test-results and playwright-report are copied into --out
  (a folder for each run under test-results/ci-image), its exit code is this command's, and it is removed at the end.
  example: kazoku-ci-image -- test e2e/renderer.demo.mjs --project=chromium-desk`;

type Docker = (args: readonly string[], input?: string) => SpawnSyncReturns<string>;

const dockerBinary = (): string => process.env.KAZOKU_DOCKER || "docker";
const docker: Docker = (args, input) => spawnSync(dockerBinary(), [...args], { encoding: "utf8", ...(input !== undefined ? { input } : {}), timeout: 120_000 });

/** Why Docker cannot be used, in a sentence a person can act on, or null when it can. */
export function dockerProblem(run: Docker = docker): string | null {
  const info = run(["info", "--format", "{{.ServerVersion}}"]);
  if (info.error && (info.error as NodeJS.ErrnoException).code === "ENOENT") return "Docker is not installed (there is no `docker` command). Install Docker Desktop, then run this again.";
  if (info.status !== 0) return "Docker is not running. Start Docker Desktop (on a Mac: open -a Docker), wait until it says it is running, then run this again.";
  return null;
}

/** Remove the containers of runs that were killed before they could remove their own: a container whose labelled pid is gone. Returns how many. */
export function removeOrphanContainers(run: Docker = docker, running: (pid: number) => boolean = alive): number {
  const listed = run(["ps", "-a", "--filter", `label=${LABEL}`, "--format", `{{.ID}} {{.Label "${LABEL}"}}`]);
  if (listed.status !== 0) return 0;
  let removed = 0;
  for (const line of listed.stdout.split("\n")) {
    const [id, pid] = line.trim().split(" ");
    if (id && pid && Number.isInteger(Number(pid)) && !running(Number(pid)) && run(["rm", "-f", "-v", id]).status === 0) removed++;
  }
  return removed;
}

/** The files CI would see: what git tracks and what it does not ignore, that still exist, but never a `.env*` file. Without git, everything but `node_modules`, `.git`, `dist`, `site` and the results. */
function repoFiles(repo: string): string[] | null {
  const listed = spawnSync("git", ["-C", repo, "ls-files", "-z", "--cached", "--others", "--exclude-standard"], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  if (listed.status !== 0) return null;
  return listed.stdout.split("\0").filter((name) => {
    if (!name || basename(name).startsWith(".env")) return false; // secrets stay on the Mac
    try {
      lstatSync(join(repo, name));
      return true;
    } catch {
      return false; // tracked but deleted in the working tree
    }
  });
}

/** Put the repo into the container's /work as a tar stream: no bind mount, so the Mac's node_modules never reach Linux. The tar is made whole first, so a failure of tar is seen, not half a repo in the container. */
function copyRepoIn(repo: string, name: string): { ok: boolean; files: number | null; error: string } {
  const files = repoFiles(repo);
  const scratch = mkdtempSync(join(tmpdir(), "kazoku-ci-image-"));
  try {
    const mac = process.platform === "darwin" ? ["--no-xattrs", "--no-acls", "--no-mac-metadata"] : [];
    const archive = join(scratch, "repo.tar");
    const tarArgs = files
      ? (writeFileSync(join(scratch, "files"), files.join("\0") + "\0"), ["-C", repo, "-cf", archive, ...mac, "--null", "-T", join(scratch, "files")])
      : ["-C", repo, "-cf", archive, ...mac, "--exclude=node_modules", "--exclude=.env*", "--exclude=./.git", "--exclude=./dist", "--exclude=./site", "--exclude=./test-results", "--exclude=./playwright-report", "."];
    const pack = spawnSync("tar", tarArgs, { env: { ...process.env, COPYFILE_DISABLE: "1" }, encoding: "utf8" });
    if (pack.status !== 0) return { ok: false, files: null, error: `tar failed: ${pack.stderr}`.trim() };
    const input = openSync(archive, "r");
    try {
      const copy = spawnSync(dockerBinary(), ["cp", "-", `${name}:/work`], { stdio: [input, "ignore", "pipe"], encoding: "utf8" });
      return { ok: copy.status === 0, files: files ? files.length : null, error: `${copy.stderr}`.trim() };
    } finally {
      closeSync(input);
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

/** Remove a folder only if nothing is in it. */
function removeIfEmpty(dir: string): void {
  try {
    rmdirSync(dir);
  } catch {
    // not empty, or not there
  }
}

/** Keep the newest `keep` run folders in `dir`, and remove the older ones. */
function pruneRuns(dir: string, keep: number): void {
  try {
    const runs = readdirSync(dir).sort(); // `<time>-<pid>` names sort oldest first
    for (const old of runs.slice(0, Math.max(0, runs.length - keep))) rmSync(join(dir, old), { recursive: true, force: true });
  } catch {
    // nothing there yet
  }
}

/**
 * Run Playwright in CI's own image, in a container with its CPUs and memory fenced, and return Playwright's exit code (2 for a mistake in the options or the repo, 3 when Docker
 * is not running). It takes one of the machine's image slots (`~/.config/kazoku-ui/browser-slots.json`), waiting if they are all held, copies the repo's files in (what git
 * tracks or would not ignore: never the Mac's `node_modules`), installs from the lockfile and builds as CI does, runs `playwright <args>`, copies `test-results` and
 * `playwright-report` out, and removes the container whatever happens, including on SIGINT, SIGTERM and SIGHUP.
 *
 * @example
 * const code = await runCiImage({ args: ["test", "e2e/renderer.demo.mjs", "--project=chromium-desk"], cpus: 3, memory: "8g" });
 * process.exitCode = code;
 */
export async function runCiImage(options: CiImageOptions): Promise<number> {
  const log = options.log ?? ((line: string) => void process.stderr.write(`${line}\n`));
  const repo = resolve(options.repo ?? process.cwd());
  let plan: CiImagePlan;
  try {
    plan = ciImagePlan(options);
  } catch (error) {
    log(`kazoku-ci-image: ${(error as Error).message}`);
    return 2;
  }
  if (options.dryRun) {
    const shown = ciImageDockerArgs(plan, "kazoku-ci-<id>", process.pid).map((word) => (word === plan.script ? "<the script below>" : word));
    log(`image: ${plan.image}\ncontainer: docker ${shown.join(" ")}\nscript:\n${plan.script}`);
    return 0;
  }
  const problem = dockerProblem();
  if (problem) {
    log(`kazoku-ci-image: ${problem}`);
    return 3;
  }
  let lock: BrowserLock;
  try {
    lock = await acquireBrowserLock({ kind: "image", ...options.lock, log });
  } catch (error) {
    log(`kazoku-ci-image: ${(error as Error).message}`);
    return 2;
  }
  const name = `kazoku-ci-${process.pid}-${Date.now().toString(36)}`;
  let created = false;
  const cleanup = (): void => {
    if (created) docker(["rm", "-f", "-v", name]);
    created = false;
    lock.release();
  };
  const onSignal = (signal: NodeJS.Signals): void => {
    log(`kazoku-ci-image: ${signal}, removing the container`);
    cleanup();
    process.exit(128 + (signal === "SIGINT" ? 2 : signal === "SIGHUP" ? 1 : 15));
  };
  const signals = ["SIGINT", "SIGTERM", "SIGHUP"] as const;
  for (const signal of signals) process.on(signal, onSignal);
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "").replace("T", "-");
  const runs = join(repo, "test-results", "ci-image");
  const out = resolve(options.out ?? join(runs, `${stamp}-${process.pid}`));
  try {
    const orphans = removeOrphanContainers();
    if (orphans) log(`kazoku-ci-image: removed ${orphans} container${orphans === 1 ? "" : "s"} left by runs that were stopped`);
    if (docker(["image", "inspect", plan.image]).status !== 0) {
      log(`kazoku-ci-image: pulling ${plan.image} (once; about 1 GB)`);
      const pull = spawnSync(dockerBinary(), ["pull", plan.image], { stdio: ["ignore", "inherit", "inherit"] });
      if (pull.status !== 0) {
        log(`kazoku-ci-image: could not pull ${plan.image}; is there a network, and is the lockfile's Playwright ${plan.playwright} a released version?`);
        return 1;
      }
    }
    const made = docker(ciImageDockerArgs(plan, name, process.pid));
    if (made.status !== 0) {
      log(`kazoku-ci-image: could not create the container: ${made.stderr.trim()}`);
      return 1;
    }
    created = true;
    log(`kazoku-ci-image: ${plan.image}, ${plan.cpus} CPUs, ${plan.memory}; copying the repo in`);
    const copied = copyRepoIn(repo, name);
    if (!copied.ok) {
      log(`kazoku-ci-image: could not copy the repo into the container: ${copied.error}`);
      return 1;
    }
    log(`kazoku-ci-image: ${copied.files ?? "all"} files copied; starting`);
    const code = await new Promise<number>((done) => {
      const child = spawn(dockerBinary(), ["start", "-a", name], { stdio: ["ignore", "inherit", "inherit"] });
      child.on("error", () => done(1));
      child.on("exit", (status) => done(status ?? 1));
    });
    // `docker start -a` returns the container's own exit code (Playwright's, as the script ends with it).
    const results: string[] = [];
    for (const from of ["test-results", "playwright-report"] as const) {
      const to = join(out, from);
      mkdirSync(to, { recursive: true });
      if (docker(["cp", `${name}:/work/${from}/.`, to]).status === 0 && readdirSync(to).length > 0) results.push(to);
      else removeIfEmpty(to);
    }
    removeIfEmpty(out);
    if (!options.out) pruneRuns(runs, 10);
    log(`kazoku-ci-image: playwright exited with ${code}${results.length ? `; copied ${results.join(" and ")}` : ""}`);
    return code;
  } finally {
    for (const signal of signals) process.off(signal, onSignal);
    cleanup();
  }
}
