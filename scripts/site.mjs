// Builds the static demo for GitHub Pages into ./site: the page, its script and styles, and the compiled library beside them.
import { cpSync, mkdirSync, rmSync } from "node:fs";

rmSync("site", { recursive: true, force: true });
mkdirSync("site", { recursive: true });
cpSync("demo", "site", { recursive: true });
// The declarations are for editors, not for a browser.
cpSync("dist", "site/dist", { recursive: true, filter: (from) => !/\.d\.ts$/.test(from) });
console.log("site/ is ready");
