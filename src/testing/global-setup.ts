import { acquireBrowserLock } from "./lock.ts";

/**
 * A Playwright `globalSetup` that takes the browser lock before any test starts and returns the teardown that lets it go. Name it in `playwright.config`; the
 * workers it starts run under the lock.
 *
 * @example
 * // playwright.config.mjs
 * export default defineConfig({ globalSetup: "@johnmorrisdotca/kazoku-ui/testing/global-setup" });
 */
export default async function globalSetup(): Promise<() => void> {
  const lock = await acquireBrowserLock();
  return () => lock.release();
}
