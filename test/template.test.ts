import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const template = readFileSync(new URL("../templates/AGENTS.md", import.meta.url), "utf8");
const MARKER = "<!-- repo-specific:";

test("the agent template has one marker, with the family rules above it and the repo's facts below", () => {
  assert.equal(template.split(MARKER).length, 2);
  const [family, repo] = template.split(MARKER) as [string, string];
  assert.match(family, /docs\/package-work\.md/);
  assert.match(family, /Do not tag and do not publish/);
  assert.match(family, /SPX_HANDOFF_PROJECT=/);
  for (const row of ["Package", "Board", "Title prefix", "Ports", "Checks", "Release", "Hand-off project"]) assert.match(repo, new RegExp(`\\| ${row}`), row);
  assert.doesNotMatch(family, /<(@scope|repo|board key|first)\b/, "no fill-in belongs above the marker");
});

test("the agent template names no private host, address, home path or key", () => {
  assert.doesNotMatch(template, /\/Users\/|\/home\/|~\/|\b(?:10|192\.168|172\.(?:1[6-9]|2\d|3[01]))\.\d+\.\d+\.\d+\b|\b100\.\d+\.\d+\.\d+\b/);
  assert.doesNotMatch(template, /ghp_|sbp_|sk-|BEGIN [A-Z ]*PRIVATE KEY|(?:token|password|secret)\s*[=:]\s*\S/i);
});
