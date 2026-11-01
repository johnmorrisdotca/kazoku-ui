import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { PARTS } from "../src/index.ts";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

test("every part is its own subpath export", () => {
  for (const part of PARTS) assert.ok(pkg.exports[`./${part}`], `./${part}`);
});

test("no runtime dependency and the MIT licence", () => {
  assert.equal(pkg.dependencies, undefined);
  assert.equal(pkg.license, "MIT");
});

test("the changelog names the version", () => {
  assert.match(readFileSync(new URL("../CHANGELOG.md", import.meta.url), "utf8"), new RegExp(`## \\[?${pkg.version.replace(/\./g, "\\.")}`));
});
