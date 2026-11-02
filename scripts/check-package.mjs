// Packs the package the way it is published (`npm pack`), installs the tarball into an empty project, and uses it as somebody who installed it would: every entry in
// `exports` imported, the element's tag defined once on a stand-in registry and left alone when it is already taken, and the pure entry run on a server with no DOM.
// A package whose `exports` name a file that is not in the tarball fails here, before it is published. `pnpm test:package` builds first.
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Each part: its subpath, its tag, the element class and define function, the names its pure entry must export, and a run on the pure entry. */
const PARTS = [
  {
    name: "view-controls", tag: "kazoku-view-controls", cls: "ViewControlsElement", define: "defineViewControls",
    pure: ["createViewController", "parseAddress", "formatAddress", "parseKeys", "zoomAbout", "pinchTo", "dragTurn", "wrapYaw", "WORDS", "wordsFor", "languageOf", "TAG", "EVENT"],
    run: `const view = pure.createViewController({ size: () => ({ width: 400, height: 300 }) });
  view.zoomAt(2, { x: 0, y: 0 });
  assert.equal(view.state.zoom, 2);`,
  },
  {
    name: "theme-switch", tag: "kazoku-theme-switch", cls: "ThemeSwitchElement", define: "defineThemeSwitch",
    pure: ["applyTheme", "parseModes", "parseTheme", "readTheme", "resolveTheme", "themeOf", "THEMES", "WORDS", "wordsFor", "languageOf", "TAG", "EVENT"],
    run: `assert.equal(pure.resolveTheme("auto", true), "dark");
  assert.deepEqual(pure.parseModes("dark light"), ["light", "dark"]);`,
  },
];
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const windows = process.platform === "win32";
const scratch = mkdtempSync(join(tmpdir(), "kazoku-package-"));

function run(command, args, cwd) {
  const ran = spawnSync(command, args, { cwd, encoding: "utf8", shell: windows });
  if (ran.status !== 0) {
    console.error(`FAIL ${command} ${args.join(" ")}\n${ran.stdout}\n${ran.stderr}`);
    process.exit(1);
  }
  return ran.stdout;
}

const packed = JSON.parse(run("npm", ["pack", "--json", "--ignore-scripts", "--pack-destination", scratch], root));
const tarball = join(scratch, packed[0].filename);
const inTarball = new Set(packed[0].files.map((file) => file.path));
console.log(`ok   npm pack: ${packed[0].filename}, ${packed[0].files.length} files`);
const shipped = [...inTarball].filter((file) => file.startsWith("docs/") || file.startsWith("demo/") || /\.(webp|png|jpe?g|gif)$/.test(file));
if (shipped.length > 0) {
  console.error(`FAIL the tarball holds the demo, docs or pictures: ${shipped.join(", ")}`);
  process.exit(1);
}
console.log("ok   no demo, doc or picture is in the tarball");

const pointed = [pkg.main, pkg.module, pkg.types, ...Object.values(pkg.exports).flatMap((entry) => Object.values(entry))];
for (const file of new Set(pointed)) {
  if (!inTarball.has(file.replace(/^\.\//, ""))) {
    console.error(`FAIL package.json points at ${file}, which is not in the tarball`);
    process.exit(1);
  }
}
console.log(`ok   every file package.json points at is in the tarball (${new Set(pointed).size})`);

const project = join(scratch, "project");
mkdirSync(project);
writeFileSync(join(project, "package.json"), JSON.stringify({ name: "consumer", private: true, type: "module" }));
run("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", tarball], project);
writeFileSync(join(project, "check.mjs"), `
import assert from "node:assert/strict";
const root = await import("${pkg.name}");
assert.deepEqual([...root.PARTS], ${JSON.stringify(PARTS.map((part) => part.name))});
${PARTS.map((part) => `
{
  const pure = await import("${pkg.name}/${part.name}");
  for (const name of ${JSON.stringify(part.pure)}) assert.ok(name in pure, "${part.name} " + name);
  assert.equal(typeof globalThis.HTMLElement, "undefined", "the pure entry needs no DOM");
  ${part.run ?? ""}
}`).join("")}

// The elements and their definitions, on a stand-in DOM.
globalThis.HTMLElement = class {};
HTMLElement.prototype.attachShadow = function () { return {}; };
const taken = new Map();
globalThis.customElements = { get: (name) => taken.get(name), define: (name, ctor) => taken.set(name, ctor) };
${PARTS.map((part) => `
{
  const element = await import("${pkg.name}/${part.name}/element");
  assert.equal(element.TAG, "${part.tag}");
  const define = await import("${pkg.name}/${part.name}/define");
  assert.equal(taken.get("${part.tag}"), element.${part.cls}, "importing define registers ${part.tag}");
  assert.equal(define.${part.define}(), false, "a second call leaves the tag alone");
  const other = new Map([["${part.tag}", class {}]]);
  assert.equal(define.${part.define}({ get: (n) => other.get(n), define: () => { throw new Error("must not define a taken tag"); } }), false);
}`).join("")}
console.log("ok   every entry imports, each tag is defined once and a taken tag is left alone");
`);
process.stdout.write(run("node", ["check.mjs"], project));

const bytes = (file) => gzipSync(readFileSync(join(root, "dist", file))).length;
const files = ["theme-switch/theme.js", "theme-switch/words.js", "theme-switch/styles.js", "theme-switch/element.js", "theme-switch/define.js", "shared/base.js", "shared/scheme.js", "shared/query.js", "view-controls/math.js", "view-controls/address.js", "view-controls/words.js", "view-controls/controller.js", "view-controls/index.js", "view-controls/styles.js", "shared/adopt.js", "view-controls/element.js", "view-controls/define.js"];
console.log(`ok   gzipped, no bundler: ${files.map((f) => `${f} ${bytes(f)}`).join(", ")} bytes`);
