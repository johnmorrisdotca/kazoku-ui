// The demo's own tests: a real browser. `pnpm test:demo` builds the demo and runs them against scripts/dev.mjs.
// This package's ports are 8100 to 8199: the demo on 8100, tests on 8101 unless TEST_PORT names another, the picture script on 8102.
import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.TEST_PORT ?? 8101);
const phone = { viewport: { width: 390, height: 844 }, hasTouch: true };
const desk = { viewport: { width: 1280, height: 900 } };

export default defineConfig({
  testDir: "e2e",
  testMatch: "*.demo.mjs",
  fullyParallel: true,
  forbidOnly: true,
  reporter: "list",
  use: { baseURL: `http://127.0.0.1:${port}`, reducedMotion: "no-preference", locale: "en-US" },
  webServer: { command: "node scripts/dev.mjs", env: { PORT: String(port) }, url: `http://127.0.0.1:${port}/`, reuseExistingServer: false },
  projects: [
    { name: "chromium-phone", use: { ...devices["Desktop Chrome"], ...phone, isMobile: true } },
    { name: "chromium-desk", use: { ...devices["Desktop Chrome"], ...desk } },
    // WebKit on a desktop viewport with touch: `isMobile` is Chromium's to honour.
    { name: "webkit-phone", use: { ...devices["Desktop Safari"], ...phone } },
    { name: "webkit-desk", use: { ...devices["Desktop Safari"], ...desk } },
  ],
});
