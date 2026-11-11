import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";

interface Result {
  id: string;
  missing: { item: string; say: string }[];
  exempt: { item: string; reason: string }[];
}
const standard = (await import(new URL("../templates/check-standard.mjs", import.meta.url).href)) as { standardOf(root: string): Result; ITEMS: Record<string, string>; USAGE: Record<string, unknown>; DATA_DOOR_SHA256: string };

const HOME = "https://johnmorrisdotca.github.io/sample-pkg/";
const README = `# Sample

[Demo](${HOME}) · [Docs](${HOME}docs/)

\`\`\`html
<script type="module" src="https://cdn.jsdelivr.net/npm/@johnmorrisdotca/sample-pkg/+esm"></script>
<iframe src="${HOME}embed.html" title="Sample"></iframe>
\`\`\`

\`\`\`ts
import { sample } from "@johnmorrisdotca/sample-pkg";
\`\`\`

Vite, webpack, React, Vue, Svelte, Angular and TypeScript: see the guides.
`;
const FRAMED = "<!doctype html><title>Sample: a page</title><kazoku-page-header what=\"a page\"></kazoku-page-header><kazoku-page-credits credits=\"Own data.\"></kazoku-page-credits>";
const FILES: Record<string, string> = {
  "package.json": JSON.stringify({ name: "@johnmorrisdotca/sample-pkg", homepage: HOME, scripts: { "test:usage": "node scripts/check-usage.ts" } }),
  "README.md": README,
  "demo/index.html": `${FRAMED}<kazoku-embed-panel></kazoku-embed-panel>`,
  "demo/builder.html": `${FRAMED}<kazoku-embed-panel kinds="html"></kazoku-embed-panel>`,
  "demo/embed.html": "<!doctype html><title>Embed</title><kazoku-page-credits embed credits=\"Own data.\"></kazoku-page-credits>",
  "demo/element-check.html": "<!doctype html>",
  "demo/family.css": "/* css */",
  "scripts/family-template.mjs": 'export const FAMILY = [{ id: "sample-pkg" }]; const header = "<kazoku-language-picker></kazoku-language-picker><kazoku-theme-switch></kazoku-theme-switch>";',
  "scripts/family-readme.mjs": "// writer",
  "scripts/docs-site.mjs": "// generator",
  "docs/site.json": "{}",
  "docs/guides/getting-started.md": "# Getting started",
  "docs/guides/ja/getting-started.md": "# はじめに",
  "examples/a.html": "<!doctype html>",
  ".github/workflows/pages.yml": "- uses: actions/deploy-pages@v5",
  ".github/workflows/ci.yml": "    container:\n      image: mcr.microsoft.com/playwright:v1.64.1-noble\n    steps:\n      - run: pnpm test:usage",
  "pnpm-lock.yaml": "importers:\n  .:\n    devDependencies:\n      '@playwright/test':\n        specifier: ^1.63.0\n        version: 1.64.1\n",
};

function make(change: (files: Record<string, string | null>) => void = () => undefined): string {
  const root = mkdtempSync(join(tmpdir(), "standard-"));
  const files: Record<string, string | null> = { ...FILES };
  change(files);
  for (const [path, text] of Object.entries(files)) {
    if (text === null) continue;
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
}
const missing = (change: (files: Record<string, string | null>) => void): string[] => {
  const root = make(change);
  try {
    return standard.standardOf(root).missing.map((one) => one.item);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
};

test("a package with every item has nothing missing", () => {
  assert.deepEqual(missing(() => undefined), []);
});

test("each item, taken away, is named, and only it", () => {
  const breaks: Record<string, (files: Record<string, string | null>) => void> = {
    demo: (files) => (files["demo/index.html"] = null),
    pages: (files) => (files[".github/workflows/pages.yml"] = null),
    homepage: (files) => (files["package.json"] = JSON.stringify({ name: "@johnmorrisdotca/sample-pkg", scripts: { "test:usage": "x" } })),
    embed: (files) => (files["demo/embed.html"] = null),
    "embed-panel": (files) => ((files["demo/index.html"] = FRAMED), (files["demo/builder.html"] = FRAMED)),
    "page-frame": (files) => (files["demo/builder.html"] = `<!doctype html><kazoku-embed-panel kinds="html"></kazoku-embed-panel>`),
    "family-files": (files) => (files["scripts/family-template.mjs"] = 'export const FAMILY = [{ id: "other" }];'),
    "docs-site": (files) => (files["scripts/docs-site.mjs"] = null),
    "ja-guides": (files) => (files["docs/guides/ja/getting-started.md"] = null),
    "usage-tested": (files) => (files["examples/a.html"] = null),
    "usage-in-ci": (files) => (files[".github/workflows/ci.yml"] = "- run: pnpm check"),
    "data-door": (files) => (files["src/data-door.ts"] = readFileSync(new URL("../templates/data-door.ts", import.meta.url), "utf8") + "\n// changed"),
    "playwright-image": (files) => (files[".github/workflows/ci.yml"] = (files[".github/workflows/ci.yml"] ?? "").replace("v1.64.1", "v1.63.0")),
    "script-tag": (files) => (files["README.md"] = README.replace(/jsdelivr/g, "cdn")),
    esm: (files) => (files["README.md"] = README.replace(/import \{ sample \} from "@johnmorrisdotca\/sample-pkg";/, "")),
    bundlers: (files) => (files["README.md"] = README.replace("Vite, webpack, ", "")),
    react: (files) => (files["README.md"] = README.replace("React, ", "")),
    vue: (files) => (files["README.md"] = README.replace("Vue, ", "")),
    svelte: (files) => (files["README.md"] = README.replace("Svelte, ", "")),
    angular: (files) => (files["README.md"] = README.replace("Angular and ", "")),
    iframe: (files) => (files["README.md"] = README.replace(/<iframe[^\n]*/, "")),
    typescript: (files) => (files["README.md"] = README.replace("TypeScript", "types")),
  };
  assert.deepEqual(Object.keys(breaks).sort(), Object.keys(standard.ITEMS).sort(), "a test for every item of the list");
  for (const [item, change] of Object.entries(breaks)) assert.deepEqual(missing(change), [item], item);
});

test("the data door: a copy of the template passes, no copy is not asked for, a changed copy is named, and the recorded hash is the template's", () => {
  const template = readFileSync(new URL("../templates/data-door.ts", import.meta.url), "utf8");
  assert.equal(standard.DATA_DOOR_SHA256, createHash("sha256").update(template.replace(/\r\n/g, "\n")).digest("hex"), "templates/check-standard.mjs records the hash of templates/data-door.ts: update DATA_DOOR_SHA256 when the template changes");
  assert.deepEqual(missing((files) => (files["src/data-door.ts"] = template)), []);
  assert.deepEqual(missing((files) => (files["src/data-door.ts"] = template.replace(/\n/g, "\r\n"))), [], "line ends do not matter");
  assert.deepEqual(missing((files) => (files["src/data-door.ts"] = "export const mine = 1;")), ["data-door"]);
  const root = make((files) => (files["src/data-door.ts"] = "export {};"));
  try {
    assert.match(standard.standardOf(root).missing[0]?.say ?? "", /differs from kazoku-ui's templates\/data-door\.ts/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the Playwright image: each workflow's tag matches every @playwright/test the lockfile pins, read the ways a workflow and a lockfile write them", () => {
  const say = (change: (files: Record<string, string | null>) => void): string[] => {
    const root = make(change);
    try {
      return standard.standardOf(root).missing.filter((one) => one.item === "playwright-image").flatMap((one) => one.say.split("; "));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  };
  const ci = (text: string) => (files: Record<string, string | null>) => (files[".github/workflows/ci.yml"] = text);
  assert.deepEqual(say(() => undefined), []);
  assert.deepEqual(say(ci("- run: pnpm test:usage")), [], "no image, nothing to match");
  // the container: shorthand, and a tag other than -noble, which the message keeps
  assert.deepEqual(say(ci("    container: mcr.microsoft.com/playwright:v1.64.1-jammy\n    steps:\n      - run: pnpm test:usage")), []);
  const jammy = say(ci("    container: mcr.microsoft.com/playwright:v1.63.0-jammy"));
  assert.equal(jammy.length, 1);
  assert.match(jammy[0] ?? "", /set ci\.yml's image to mcr\.microsoft\.com\/playwright:v1\.64\.1-jammy, the @playwright\/test of \. in pnpm-lock\.yaml \(now v1\.63\.0-jammy\)/);
  // a comment, on its own line or after one, is not a tag
  assert.deepEqual(say(ci("    # was mcr.microsoft.com/playwright:v1.50.0-noble\n    container:\n      image: mcr.microsoft.com/playwright:v1.64.1-noble # not mcr.microsoft.com/playwright:v1.40.0-noble")), []);
  // a correct tag beside a wrong one: only the wrong one is named
  const mixed = say((files) => (files[".github/workflows/docs.yml"] = "    container:\n      image: mcr.microsoft.com/playwright:v1.63.0-noble"));
  assert.equal(mixed.length, 1);
  assert.match(mixed[0] ?? "", /docs\.yml/);
  // a tag that is not a whole version is not checked
  assert.deepEqual(say(ci("    container:\n      image: mcr.microsoft.com/playwright:${{ env.PW }}\n    other: mcr.microsoft.com/playwright:latest mcr.microsoft.com/playwright:v1.64")), []);
  // a catalog: the importer and the catalog both pin it, and both are read
  const catalog = "catalogs:\n  default:\n    '@playwright/test':\n      specifier: ^1.64.0\n      version: 1.64.1\nimporters:\n  .:\n    devDependencies:\n      '@playwright/test':\n        specifier: 'catalog:'\n        version: 1.64.1\n";
  assert.deepEqual(say((files) => (files["pnpm-lock.yaml"] = catalog)), []);
  // two importers on two versions: the one that differs is named
  const two = say((files) => (files["pnpm-lock.yaml"] = `${files["pnpm-lock.yaml"]}  site:\n    devDependencies:\n      '@playwright/test':\n        specifier: ^1.60.0\n        version: 1.60.0\n`));
  assert.equal(two.length, 1);
  assert.match(two[0] ?? "", /v1\.60\.0-noble, the @playwright\/test of site/);
  // the older one-line form is read; a link: is said plainly
  assert.deepEqual(say((files) => (files["pnpm-lock.yaml"] = "devDependencies:\n  '@playwright/test': 1.64.1\n")), []);
  const linked = say((files) => (files["pnpm-lock.yaml"] = "importers:\n  .:\n    devDependencies:\n      '@playwright/test':\n        specifier: link:../playwright\n        version: link:../playwright\n"));
  assert.match(linked[0] ?? "", /gives @playwright\/test for \. as "link:\.\.\/playwright", not a version this check can read/);
  // an image with no Playwright in the lockfile
  assert.match(say((files) => (files["pnpm-lock.yaml"] = null))[0] ?? "", /pnpm-lock\.yaml names no @playwright\/test/);
});

test("an item that cannot apply is exempt when package.json says why, and not when it does not", () => {
  const exempt = (reason: string) => (files: Record<string, string | null>) => {
    files["README.md"] = README.replace("Angular and ", "");
    files["package.json"] = JSON.stringify({ name: "@johnmorrisdotca/sample-pkg", homepage: HOME, scripts: { "test:usage": "x" }, family: { notApplicable: { angular: reason } } });
  };
  assert.deepEqual(missing(exempt("a data package with no element to put in a template")), []);
  assert.deepEqual(missing(exempt("no")), ["angular"]);
  const unknown = (files: Record<string, string | null>) => (files["package.json"] = JSON.stringify({ name: "@johnmorrisdotca/sample-pkg", homepage: HOME, scripts: { "test:usage": "x" }, family: { notApplicable: { nothing: "not an item on the list at all" } } }));
  assert.deepEqual(missing(unknown), ["nothing"]);
});

test("the page frame: a page that lacks the title, the header or the credit line is named, with what it lacks; placeholders and exempt pages count", () => {
  const say = (change: (files: Record<string, string | null>) => void): string => {
    const root = make(change);
    try {
      return standard.standardOf(root).missing.map((one) => one.say).join("|");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  };
  assert.match(say((files) => (files["demo/builder.html"] = "<kazoku-embed-panel></kazoku-embed-panel>")), /builder\.html \(a <title>, <kazoku-page-header>, <kazoku-page-credits>\)/);
  assert.match(say((files) => (files["demo/embed.html"] = "<!doctype html><title>Embed</title>")), /embed\.html \(<kazoku-page-credits>\)/);
  // An embed page needs no header; a test page needs nothing; the build's placeholders are the tags.
  assert.deepEqual(missing((files) => (files["demo/builder.html"] = "<!--frame:head--><!--frame:header--><!--frame:credits--><kazoku-embed-panel></kazoku-embed-panel>")), []);
  assert.deepEqual(missing((files) => (files["demo/builder.html"] = "<!--family:head--><!--frame:header--><!--frame:credits--><kazoku-embed-panel></kazoku-embed-panel>")), []);
  assert.deepEqual(missing((files) => (files["demo/embed-3d.html"] = "<!doctype html><title>3D</title><!--frame:credits-->")), []);
  assert.deepEqual(missing((files) => (files["demo/embed-panel.html"] = "<!doctype html>")), ["page-frame"], "embed-panel.html is a page like any other");
});

test("the check is plain JavaScript with no dependency and names no private host or key", () => {
  const text = readFileSync(new URL("../templates/check-standard.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(text, /^import .* from "(?!node:)/m);
  assert.doesNotMatch(text, /\/Users\/|\/home\/|\b(?:10|192\.168)\.\d+\.\d+\.\d+\b|ghp_|sbp_|sk-/);
});
