import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";

interface Result {
  id: string;
  missing: { item: string; say: string }[];
  exempt: { item: string; reason: string }[];
}
const standard = (await import(new URL("../templates/check-standard.mjs", import.meta.url).href)) as { standardOf(root: string): Result; ITEMS: Record<string, string>; USAGE: Record<string, unknown> };

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
const FILES: Record<string, string> = {
  "package.json": JSON.stringify({ name: "@johnmorrisdotca/sample-pkg", homepage: HOME, scripts: { "test:usage": "node scripts/check-usage.ts" } }),
  "README.md": README,
  "demo/index.html": "<!doctype html><kazoku-embed-panel></kazoku-embed-panel>",
  "demo/builder.html": "<!doctype html><kazoku-embed-panel kinds=\"html\"></kazoku-embed-panel>",
  "demo/embed.html": "<!doctype html>",
  "demo/family.css": "/* css */",
  "scripts/family-template.mjs": 'export const FAMILY = [{ id: "sample-pkg" }]; const header = "<kazoku-language-picker></kazoku-language-picker><kazoku-theme-switch></kazoku-theme-switch>";',
  "scripts/family-readme.mjs": "// writer",
  "scripts/docs-site.mjs": "// generator",
  "docs/site.json": "{}",
  "docs/guides/getting-started.md": "# Getting started",
  "docs/guides/ja/getting-started.md": "# はじめに",
  "examples/a.html": "<!doctype html>",
  ".github/workflows/pages.yml": "- uses: actions/deploy-pages@v5",
  ".github/workflows/ci.yml": "- run: pnpm test:usage",
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
    "embed-panel": (files) => ((files["demo/index.html"] = "<!doctype html>"), (files["demo/builder.html"] = "<!doctype html>")),
    "family-files": (files) => (files["scripts/family-template.mjs"] = 'export const FAMILY = [{ id: "other" }];'),
    "docs-site": (files) => (files["scripts/docs-site.mjs"] = null),
    "ja-guides": (files) => (files["docs/guides/ja/getting-started.md"] = null),
    "usage-tested": (files) => (files["examples/a.html"] = null),
    "usage-in-ci": (files) => (files[".github/workflows/ci.yml"] = "- run: pnpm check"),
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

test("the check is plain JavaScript with no dependency and names no private host or key", () => {
  const text = readFileSync(new URL("../templates/check-standard.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(text, /^import .* from "(?!node:)/m);
  assert.doesNotMatch(text, /\/Users\/|\/home\/|\b(?:10|192\.168)\.\d+\.\d+\.\d+\b|ghp_|sbp_|sk-/);
});
