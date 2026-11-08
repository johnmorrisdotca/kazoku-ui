---
title: The browser lock
section: how-to
order: 19
description: A lock in the user's cache folder so that only one headless browser runs at a time on a machine, taken by a package's Playwright config or by any script that launches Chromium.
---

# The browser lock

Two headless browsers drawing WebGL in software at once on one machine make heavy tests time out, and the timeouts look like real failures. `@johnmorrisdotca/kazoku-ui/testing` has a lock that makes a second run wait for the first.

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

`withBrowserLock(fn)` takes the lock, runs `fn` and lets the lock go, even if `fn` throws. When the take and the let-go are in different places, `const lock = await acquireBrowserLock()` and `lock.release()` do the same. Both take `{ pollMs, reportMs, maxAgeMs, log }`.

## How it works

- **The file.** `browser.lock` in `kazoku-ui` inside the user's cache folder: `~/Library/Caches` on a Mac, else `$XDG_CACHE_HOME` or `~/.cache`. It holds the holder's pid, package name, folder, command and start time as JSON.
- **Atomic.** The file is written complete and then hard-linked into place, so exactly one of two runs that arrive together gets it, and nobody reads a half-written file.
- **Waiting.** The second run looks again every half second and prints `waiting for the browser lock: held by <repo> pid <n> since <time>` every 30 seconds.
- **Stale locks.** A lock whose pid is gone, or that is over three hours old, is taken over.
- **Let go** on a normal exit, on an error, and on SIGINT, SIGTERM and SIGHUP.
- **One process tree.** The holder puts a token in `KAZOKU_BROWSER_LOCK`. A child that inherits it (a Playwright worker, a script a script starts) is let in at once and never lets the lock go.
- **CI.** With the `CI` variable set the lock does nothing: a CI job is one machine and one run.

## Who holds it

`browserLockStatus()` returns `{ file, holder, stale }` and `clearBrowserLock({ force })` removes a stale lock, or any lock with `force: true`. The same two are a command:

```sh
npx kazoku-browser-lock status          # free, or who holds it; exit 1 while a live run holds it
npx kazoku-browser-lock clear           # remove a stale lock; refuses while the holder is running
npx kazoku-browser-lock clear --force   # remove it anyway
```
