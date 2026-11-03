// Builds the static demo for GitHub Pages into ./site: the page, its script and styles, and the compiled library beside them.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { publishThumbnails, thumbnailHead } from "./family-thumbnail.mjs";

rmSync("site", { recursive: true, force: true });
mkdirSync("site", { recursive: true });
cpSync("demo", "site", { recursive: true });
// The family's card in the demo's <head> (og:image, twitter:image, the icon), and the three pictures published beside it.
const ALT = "Kazoku UI: a card with a blue circle and a black triangle, turned and tipped in 3D, over the view controls that turn it.";
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
writeFileSync("site/index.html", readFileSync("demo/index.html", "utf8").replace("</head>", `  ${thumbnailHead(pkg, { alt: ALT })}\n</head>`));
publishThumbnails(".", "site");
// The declarations are for editors, not for a browser.
cpSync("dist", "site/dist", { recursive: true, filter: (from) => !/\.d\.ts$/.test(from) });
// The renderer demo's copy of three.js (the library never bundles it; the demo's import map points here).
mkdirSync("site/vendor/three", { recursive: true });
for (const file of ["three.module.js", "three.core.js"]) cpSync(`node_modules/three/build/${file}`, `site/vendor/three/${file}`);
console.log("site/ is ready");
