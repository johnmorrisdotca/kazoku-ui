// The demo's own tests: a real browser. `pnpm test:demo` builds the demo and runs them against scripts/dev.mjs.
// This package's ports are 8400 to 8499: the demo on 8400, tests on 8401 unless TEST_PORT names another, the picture script on 8402.
import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.TEST_PORT ?? 8401);
const phone = { viewport: { width: 390, height: 844 }, hasTouch: true };
const desk = { viewport: { width: 1280, height: 900 } };
// Every WebGL page is drawn in software (SwiftShader), never on the machine's graphics card: a test run once panicked a Mac's graphics driver. Same arguments as SOFTWARE_GL_ARGS in src/testing.
const gl = { launchOptions: { args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] } };
// WebKit has no software switch, so off CI it skips the pages that draw WebGL; CI (a hosted runner, no graphics card) plays them.
const webglPages = process.env.CI ? undefined : /renderer\.demo/;

export default defineConfig({
  testDir: "e2e",
  testMatch: "*.demo.mjs",
  fullyParallel: true,
  forbidOnly: true,
  globalSetup: "./dist/testing/global-setup.js",
  reporter: "list",
  use: { baseURL: `http://127.0.0.1:${port}`, headless: true, reducedMotion: "no-preference", locale: "en-US" },
  webServer: { command: "node scripts/dev.mjs", env: { PORT: String(port) }, url: `http://127.0.0.1:${port}/`, reuseExistingServer: false },
  projects: [
    { name: "chromium-phone", use: { ...devices["Desktop Chrome"], ...phone, ...gl, isMobile: true } },
    { name: "chromium-desk", use: { ...devices["Desktop Chrome"], ...desk, ...gl } },
    // WebKit on a desktop viewport with touch: `isMobile` is Chromium's to honour.
    { name: "webkit-phone", use: { ...devices["Desktop Safari"], ...phone }, testIgnore: webglPages },
    { name: "webkit-desk", use: { ...devices["Desktop Safari"], ...desk }, testIgnore: webglPages },
  ],
});
