// The demo's fonts: IBM Plex Sans (400, 600), IBM Plex Sans JP (400, 600) and IBM Plex Mono (400, 500), served from the demo's own address, never from Google.
// They are SIL Open Font License 1.1 fonts (see docs/guides/interface.md); the copies come from the @fontsource packages (dev dependencies, not part of the published package), and each
// licence text is copied beside them. `plexCss()` is the one stylesheet; `plexFiles()` lists the woff2 files it names, with where each one is on disk.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const FACES = [
  ["ibm-plex-sans", [400, 600]],
  ["ibm-plex-sans-jp", [400, 600]],
  ["ibm-plex-mono", [400, 500]],
];

const folder = (name) => dirname(require.resolve(`@fontsource/${name}/package.json`));

/** The stylesheet: each @font-face of the weights above, its url a bare file name in the same folder, woff2 only. */
export function plexCss() {
  const out = ["/* IBM Plex Sans, Plex Sans JP and Plex Mono: SIL Open Font License 1.1. See OFL-*.txt beside this file. */"];
  for (const [name, weights] of FACES) {
    for (const weight of weights) {
      const css = readFileSync(join(folder(name), `${weight}.css`), "utf8");
      out.push(css.replace(/src: url\(\.\/files\/([^)]+\.woff2)\) format\('woff2'\), url\([^)]+\) format\('woff'\);/g, "src: url(./$1) format('woff2');"));
    }
  }
  return out.join("\n");
}

/** The woff2 files the stylesheet names: `{ file, path }`. */
export function plexFiles() {
  const names = new Set([...plexCss().matchAll(/url\(\.\/([^)]+\.woff2)\)/g)].map((match) => match[1]));
  const found = [];
  for (const file of names) {
    for (const [name] of FACES) {
      const path = join(folder(name), "files", file);
      if (file.startsWith(`${name}-`) && existsSync(path)) found.push({ file, path });
    }
  }
  return found;
}

/** The licence texts: `{ file, path }` for each family. */
export function plexLicences() {
  return FACES.map(([name]) => ({ file: `OFL-${name}.txt`, path: join(folder(name), "LICENSE") }));
}
