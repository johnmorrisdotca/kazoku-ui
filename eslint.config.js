import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/", "site/", "node_modules/", "test-results/", "playwright-report/"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { files: ["scripts/**/*.mjs", "e2e/**/*.mjs", "playwright.config.mjs"], languageOptions: { globals: { console: "readonly", process: "readonly", URL: "readonly", Buffer: "readonly", document: "readonly", window: "readonly", PointerEvent: "readonly", WheelEvent: "readonly", fetch: "readonly", setTimeout: "readonly", FileReader: "readonly", Image: "readonly", getComputedStyle: "readonly", customElements: "readonly", HTMLElement: "readonly", history: "readonly", location: "readonly" } } },
  { files: ["demo/**/*.js"], languageOptions: { globals: { document: "readonly", window: "readonly", location: "readonly", history: "readonly", navigator: "readonly", URLSearchParams: "readonly", matchMedia: "readonly", requestAnimationFrame: "readonly", customElements: "readonly", console: "readonly" } } },
);
