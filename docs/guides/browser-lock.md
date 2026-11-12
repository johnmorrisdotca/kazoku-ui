---
title: The browser lock
section: how-to
order: 19
description: A lock and a first-come, first-served queue in the user's cache folder so that only one headless browser runs at a time on a machine, taken by a package's Playwright config or by any script that launches Chromium; and image slots, so several runs in CI's own Playwright image, each fenced to its CPUs and memory, can run at once beside it.
---

# The browser lock

Two headless browsers drawing WebGL in software at once on one machine make heavy tests time out, and the timeouts look like real failures. `@johnmorrisdotca/kazoku-ui/testing` has a lock that makes a second run wait for the first, and a queue that serves the waiting runs in the order they arrived.

Runs in CI's own Playwright image are the exception: each is a container with its CPUs and memory fenced, so they cannot slow each other or the native run, and a machine can have several at once. See [Runs in CI's own image](#runs-in-cis-own-image).

## Playwright

One line in `playwright.config`:

```js no-check
import { defineConfig } from "@playwright/test";

export default defineConfig({
  globalSetup: "@johnmorrisdotca/kazoku-ui/testing/global-setup",
  // ...the projects, with launchOptions: { args: [...SOFTWARE_GL_ARGS] }
});
```

The runner takes the lock before the first test and lets it go when the run ends. The workers it starts inherit the lock, so they do not wait for it.

## A script that launches Chromium

```js no-check
import { chromium } from "@playwright/test";
import { SOFTWARE_GL_ARGS, withBrowserLock } from "@johnmorrisdotca/kazoku-ui/testing";

await withBrowserLock(async () => {
  const browser = await chromium.launch({ args: [...SOFTWARE_GL_ARGS] });
  try {
    // ...use the browser
  } finally {
    await browser.close();
  }
});
```

`withBrowserLock(fn)` takes the lock, runs `fn` and lets the lock go, even if `fn` throws. When the take and the let-go are in different places, `const lock = await acquireBrowserLock()` and `lock.release()` do the same. Both take `{ pollMs, reportMs, maxAgeMs, log }` (`reportMs` is one minute unless you say otherwise).

## Runs in CI's own image

```sh
npx kazoku-ci-image -- test e2e/renderer.demo.mjs --project=chromium-desk
npx kazoku-ci-image --cpus 4 --memory 12g -- test --project=webkit-desk --shard=1/2
```

`kazoku-ci-image [--cpus 3] [--memory 8g] [--out dir] [--setup "cmd"] [--node 24] [--dry-run] -- <playwright arguments>` (also `kazoku-browser-queue ci-image ...`) runs Playwright where CI runs it:

1. It reads the `@playwright/test` version from the lockfile and uses `mcr.microsoft.com/playwright:v<version>-noble`, pulled once.
2. It takes an image slot (below), waiting if they are all held.
3. It starts a container with `--ipc=host`, `--cpus` and `--memory` (swap included, so the fence holds), `CI=true`, and a named volume `kazoku-ci-cache` that keeps the package store between runs.
4. It copies the repo in as a tar stream of the files git tracks or would not ignore, made whole before it is sent, so a failed tar stops the run instead of leaving half a repo. The Mac's `node_modules`, `dist` and every `.env*` file never go in, and nothing is bind-mounted, so Linux installs its own.
5. In the container it installs pnpm at the `packageManager` version, runs `pnpm install --frozen-lockfile`, builds (`pnpm build`, then `pnpm site` when there is a `site` script; a `site` script that builds first is not built twice), and runs `pnpm exec playwright` with your arguments. `--setup "cmd"` replaces the build; `--node 24` puts that Node in, as CI's `setup-node` does, where the image's own Node differs.
6. It copies `test-results` and `playwright-report` into a folder of this run's own, `test-results/ci-image/<time>-<pid>` (the newest ten are kept; `--out dir` names another), so runs side by side never overwrite each other's results, returns Playwright's exit code, and removes the container, also on Ctrl-C and on a kill. A container left by a run that was killed outright is removed by the next run.

Playwright's first word may be left out (`-- e2e/a.demo.mjs` means `test e2e/a.demo.mjs`), and `--workers` is half the container's CPUs unless you give one. If Docker is not running the command says so (exit 3) and takes no slot. `--dry-run` prints the image, the container's options and the script, and runs nothing.

**When to use it.**

- **A failure only CI shows.** CI's demo job runs in this image; a local native run has other fonts, other browser builds and a graphics driver of its own.
- **Fonts, text width and layout** that depend on the system's fonts.
- **WebKit.** Native WebKit has no software-GL switch, so a native run skips the WebGL pages; in the image, as in CI, it plays them.
- **Software-GL specs** (the renderer, the scene, the body label), which CI draws the same way.
- **Heavy runs side by side.** Two heavy specs (the renderer's and the scene's) took 27 s together against 52 s one after the other on a Mac Studio, each run being about 25 s with its install and build.

For quick work on one spec, the native run is still faster to start and is what `pnpm test:demo` does.

## Slots

A machine has native slots and image slots, set in `~/.config/kazoku-ui/browser-slots.json` (`KAZOKU_BROWSER_SLOTS_FILE` names another file):

```json
{ "native": 1, "image": 4 }
```

- **`native`** is how many native runs may hold the browser at once. It is never below 1, and 1 is right: timing tests interfere. A native run (`globalSetup`, `withBrowserLock`) takes one.
- **`image`** is how many runs in the CI image may hold a slot at once. Set it from the machine: the Docker Desktop CPUs divided by `--cpus` (16 CPUs and 3 each is 5; 4 leaves room for the native run). A Mac Studio with 20 cores and Docker at 16 CPUs uses 4; a laptop 2; a machine with little to spare 0 or 1.
- **Missing file, or an `image` of 0** (the default): the machine has one native slot and no image slots. Nothing about it changes, and `kazoku-ci-image` stops with a sentence that says where to set them. Other machines change only when someone writes the file.

The two kinds do not wait for each other: a native run holds its slot while up to `image` containers run beside it. Within a kind the line is first come, first served, and a waiting run says `waiting for an image slot: 1st in line, 4 of 4 slots held, the longest by ...` once a minute. A holder whose pid is gone frees its slot, as before. `acquireBrowserLock({ kind: "image" })` takes an image slot from code (it throws when the machine has none), `browserSlots()` reads the file and `slotsFile()` names it. `runCiImage(options)` is the command as a function, `ciImagePlan(options)` works out the image, steps and script without touching Docker, and `playwrightVersion(lockfileText)` reads the version from a lockfile.

## How it works

- **The file.** `browser.lock` (the first native slot; image slots are `browser.image-1.lock` and on) in `kazoku-ui` inside the user's cache folder: `~/Library/Caches` on a Mac, else `$XDG_CACHE_HOME` or `~/.cache`. It holds the holder's pid, package name, folder, command, npm script and start time as JSON. `KAZOKU_BROWSER_LOCK_DIR` names another folder for the lock, the queue and the priority file together; tests of the lock itself use it so they never touch the real one.
- **Atomic.** The file is written complete and then hard-linked into place, so exactly one of two runs that arrive together gets it, and nobody reads a half-written file.
- **The queue.** A run that finds the lock held does not poll for it against the others. It writes a ticket (pid, package, folder, command, time) in the `queue` folder next to the lock (`queue-image` for runs in the CI image), and only the oldest live ticket may take the lock when it is free. Whoever polls faster gains nothing. The ticket goes when the run takes the lock or ends.
- **Waiting.** Once a minute the waiting run prints where it stands: `waiting for the browser: 2nd in line, holder hoshi-stars test:demo for 12 min`.
- **Dead runs clear themselves.** A ticket whose pid is gone, or that has not been touched for two minutes (a waiting run touches it every ten seconds), is removed by the next run that looks. A lock whose pid is gone, or that is over three hours old, is taken over. Nothing is ever killed.
- **Let go** on a normal exit, on an error, and on SIGINT, SIGTERM and SIGHUP.
- **One process tree.** The holder puts a token in `KAZOKU_BROWSER_LOCK`. A child that inherits it (a Playwright worker, a script a script starts) is let in at once and never lets the lock go.
- **CI.** With the `CI` variable set the lock does nothing: a CI job is one machine and one run.
- **Older versions.** A package still on the earlier lock code (no queue) works alongside. It takes the lock whenever it is free, so it can jump the line; it never breaks the lock or the tickets. It joins the queue when its package takes this version. A run on a version from before the image slots reads only the `queue` folder, where native runs' tickets are, and sees no image slots: runs in the CI image keep their tickets in `queue-image`, so they never stand in front of it, and it never waits for them.

## See it

```sh
npx kazoku-browser-queue status
```

It shows each slot and who holds it (package, npm script, pid, minutes), the image slots and how many are in use, the waiting runs in the order they will be served (the line for the browser, and the line for an image slot), the priority if one is set, the machine's load (the 1, 5 and 15 minute averages and the number of cores), and a `WARNING:` line when a holder has had the lock for more than 45 minutes. It only looks and changes nothing, so it is safe to run at any time. In this repository, `node src/testing/cli.ts status`.

## Put one waiter first

```sh
npx kazoku-browser-queue first ~/Projects/hoshi-stars   # the oldest waiter from that folder (or inside it) goes next
npx kazoku-browser-queue first --clear                  # take the priority away
npx kazoku-browser-queue first ~/Projects/hoshi-stars --image   # the same, in the line for an image slot
```

This writes the folder into a `priority` file next to the lock (`priority-image` for `--image`: each kind has its own line and its own priority) (`setBrowserPriority(folder)` and `setBrowserPriority(null)` do the same from code; `orderBrowserQueue(tickets, priority)` is the pure function that puts a list of tickets in serving order). The run that holds the lock is not stopped: the named waiter goes next. The priority is spent when that waiter takes the lock; set it again for the next one. A priority that names a folder nobody is waiting from does nothing.

## Who holds it

`browserQueueStatus()` returns the same picture as an object: `{ file, holder, stale, heldMinutes, slots, configured, queue, priority, imagePriority, warnings }` (`file`, `holder`, `stale` and `heldMinutes` are the first native slot's; `slots` is every slot). `browserSlotStatuses()` returns just the slots. `browserLockStatus()` returns `{ file, holder, stale }` and `clearBrowserLock({ force })` removes a stale lock in any slot, or any lock with `force: true`. They are commands too:

```sh
npx kazoku-browser-lock status          # free, or who holds it and who waits; exit 1 while a live run holds a native slot; a run in the CI image does not count
npx kazoku-browser-lock clear           # remove a stale lock; refuses while the holder is running
npx kazoku-browser-lock clear --force   # remove it anyway
```

`kazoku-browser-queue` and `kazoku-browser-lock` are the same command.
