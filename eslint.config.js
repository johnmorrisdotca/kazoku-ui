import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // scripts/family-thumbnail.mjs is the family's shared file, the same in every package (johnmorrisdotca/.github): never edited here.
  { ignores: ["dist/", "site/", "node_modules/", "test-results/", "playwright-report/", "scripts/family-thumbnail.mjs"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { files: ["scripts/**/*.mjs", "e2e/**/*.mjs", "templates/**/*.mjs", "playwright.config.mjs"], languageOptions: { globals: { console: "readonly", process: "readonly", URL: "readonly", Buffer: "readonly", document: "readonly", window: "readonly", PointerEvent: "readonly", WheelEvent: "readonly", fetch: "readonly", setTimeout: "readonly", FileReader: "readonly", Image: "readonly", getComputedStyle: "readonly", customElements: "readonly", HTMLElement: "readonly", history: "readonly", location: "readonly", navigator: "readonly" } } },
  { files: ["demo/**/*.js"], languageOptions: { globals: { document: "readonly", window: "readonly", location: "readonly", history: "readonly", navigator: "readonly", URLSearchParams: "readonly", matchMedia: "readonly", requestAnimationFrame: "readonly", customElements: "readonly", console: "readonly", IntersectionObserver: "readonly", setInterval: "readonly", HTMLElement: "readonly", Image: "readonly", URL: "readonly", Blob: "readonly" } } },
);
