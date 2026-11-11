---
title: The browser lock
section: how-to
order: 19
description: A lock and a first-come, first-served queue in the user's cache folder so that only one headless browser runs at a time on a machine, taken by a package's Playwright config or by any script that launches Chromium.
---

# The browser lock

Two headless browsers drawing WebGL in software at once on one machine make heavy tests time out, and the timeouts look like real failures. `@johnmorrisdotca/kazoku-ui/testing` has a lock that makes a second run wait for the first, and a queue that serves the waiting runs in the order they arrived.

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

## How it works

- **The file.** `browser.lock` in `kazoku-ui` inside the user's cache folder: `~/Library/Caches` on a Mac, else `$XDG_CACHE_HOME` or `~/.cache`. It holds the holder's pid, package name, folder, command, npm script and start time as JSON. `KAZOKU_BROWSER_LOCK_DIR` names another folder for the lock, the queue and the priority file together; tests of the lock itself use it so they never touch the real one.
- **Atomic.** The file is written complete and then hard-linked into place, so exactly one of two runs that arrive together gets it, and nobody reads a half-written file.
- **The queue.** A run that finds the lock held does not poll for it against the others. It writes a ticket (pid, package, folder, command, time) in the `queue` folder next to the lock, and only the oldest live ticket may take the lock when it is free. Whoever polls faster gains nothing. The ticket goes when the run takes the lock or ends.
- **Waiting.** Once a minute the waiting run prints where it stands: `waiting for the browser: 2nd in line, holder hoshi-stars test:demo for 12 min`.
- **Dead runs clear themselves.** A ticket whose pid is gone, or that has not been touched for two minutes (a waiting run touches it every ten seconds), is removed by the next run that looks. A lock whose pid is gone, or that is over three hours old, is taken over. Nothing is ever killed.
- **Let go** on a normal exit, on an error, and on SIGINT, SIGTERM and SIGHUP.
- **One process tree.** The holder puts a token in `KAZOKU_BROWSER_LOCK`. A child that inherits it (a Playwright worker, a script a script starts) is let in at once and never lets the lock go.
- **CI.** With the `CI` variable set the lock does nothing: a CI job is one machine and one run.
- **Older versions.** A package still on the earlier lock code (no queue) works alongside. It takes the lock whenever it is free, so it can jump the line; it never breaks the lock or the tickets. It joins the queue when its package takes this version.

## See it

```sh
npx kazoku-browser-queue status
```

It shows who holds the browser (package, npm script, pid, minutes), the waiting runs in the order they will be served, the priority if one is set, and a `WARNING:` line when a holder has had the lock for more than 45 minutes. It only looks and changes nothing, so it is safe to run at any time. In this repository, `node src/testing/cli.ts status`.

## Put one waiter first

```sh
npx kazoku-browser-queue first ~/Projects/hoshi-stars   # the oldest waiter from that folder (or inside it) goes next
npx kazoku-browser-queue first --clear                  # take the priority away
```

This writes the folder into a `priority` file next to the lock (`setBrowserPriority(folder)` and `setBrowserPriority(null)` do the same from code; `orderBrowserQueue(tickets, priority)` is the pure function that puts a list of tickets in serving order). The run that holds the lock is not stopped: the named waiter goes next. The priority is spent when that waiter takes the lock; set it again for the next one. A priority that names a folder nobody is waiting from does nothing.

## Who holds it

`browserQueueStatus()` returns the same picture as an object: `{ file, holder, stale, heldMinutes, queue, priority, warnings }`. `browserLockStatus()` returns `{ file, holder, stale }` and `clearBrowserLock({ force })` removes a stale lock, or any lock with `force: true`. They are commands too:

```sh
npx kazoku-browser-lock status          # free, or who holds it and who waits; exit 1 while a live run holds it
npx kazoku-browser-lock clear           # remove a stale lock; refuses while the holder is running
npx kazoku-browser-lock clear --force   # remove it anyway
```

`kazoku-browser-queue` and `kazoku-browser-lock` are the same command.
