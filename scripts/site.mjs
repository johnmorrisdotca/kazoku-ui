// Builds the static demo for GitHub Pages into ./site: the page, its script and styles, and the compiled library beside them.
import { cpSync, mkdirSync, rmSync } from "node:fs";

rmSync("site", { recursive: true, force: true });
mkdirSync("site", { recursive: true });
cpSync("demo", "site", { recursive: true });
// The declarations are for editors, not for a browser.
cpSync("dist", "site/dist", { recursive: true, filter: (from) => !/\.d\.ts$/.test(from) });
// The renderer demo's copy of three.js (the library never bundles it; the demo's import map points here).
mkdirSync("site/vendor/three", { recursive: true });
for (const file of ["three.module.js", "three.core.js"]) cpSync(`node_modules/three/build/${file}`, `site/vendor/three/${file}`);
console.log("site/ is ready");
