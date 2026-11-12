// The shared release workflow's "CI has succeeded on this commit" step (the `require-ci-workflow` input, KAZOKU-UI-16): its shell is taken out of the
// YAML and run with a stand-in `curl`, so a red, a missing, a green and a refused-then-open answer each give the exit code a release depends on.
import { test } from "node:test";
import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const yaml = readFileSync(new URL("../.github/workflows/reusable-release.yml", import.meta.url), "utf8");

/** The step's `run:` block, with its indentation taken off. */
function stepScript(): string {
  const start = yaml.indexOf("      - name: CI has succeeded on this commit");
  assert.ok(start >= 0, "the workflow has the step");
  const rest = yaml.slice(start);
  const body = rest.slice(rest.indexOf("        run: |\n") + "        run: |\n".length);
  const end = body.search(/\n {6}- /);
  return body
    .slice(0, end)
    .split("\n")
    .map((line) => line.replace(/^ {10}/, ""))
    .join("\n");
}

type Answer = { code: number; body?: unknown };

/** Run the step. `answers` are what the stand-in curl says to its first, second ... call (the first carries the token). */
function run(answers: Answer[]): { status: number | null; out: string; calls: string[] } {
  const dir = mkdtempSync(join(tmpdir(), "reusable-release-"));
  mkdirSync(join(dir, "bin"));
  writeFileSync(join(dir, "answers.json"), JSON.stringify(answers));
  // curl -sS -o FILE -w '%{http_code}' [-H ...] URL: write the canned body to FILE, print the canned code, and note whether a token was sent.
  writeFileSync(
    join(dir, "bin", "curl"),
    `#!/usr/bin/env node
const fs = require("node:fs");
const argv = process.argv.slice(2);
const answers = JSON.parse(fs.readFileSync(${JSON.stringify(join(dir, "answers.json"))}, "utf8"));
const log = ${JSON.stringify(join(dir, "calls.log"))};
const n = fs.existsSync(log) ? fs.readFileSync(log, "utf8").split("\\n").filter(Boolean).length : 0;
fs.appendFileSync(log, (argv.some((a) => /^Authorization:/.test(a)) ? "token" : "anonymous") + " " + argv[argv.length - 1] + "\\n");
const answer = answers[Math.min(n, answers.length - 1)];
fs.writeFileSync(argv[argv.indexOf("-o") + 1], JSON.stringify(answer.body ?? {}));
process.stdout.write(String(answer.code));
`,
  );
  chmodSync(join(dir, "bin", "curl"), 0o755);
  writeFileSync(join(dir, "step.sh"), stepScript());
  const ran = spawnSync("bash", ["-e", join(dir, "step.sh")], {
    encoding: "utf8",
    env: {
      PATH: `${join(dir, "bin")}:${process.env.PATH}`,
      RUNNER_TEMP: dir,
      CI_WORKFLOW: "ci.yml",
      GH_TOKEN: "t0ken",
      GITHUB_REPOSITORY: "johnmorrisdotca/example",
      GITHUB_SHA: "abc123",
    },
  });
  let calls: string[] = [];
  try {
    calls = readFileSync(join(dir, "calls.log"), "utf8").split("\n").filter(Boolean);
  } catch {
    /* curl was never called */
  }
  return { status: ran.status, out: ran.stdout + ran.stderr, calls };
}

const runOf = (status: string, conclusion: string | null) => ({ status, conclusion, html_url: `https://example.test/${status}-${conclusion}` });

test("the step is there, only when the input is set, and asks for this commit's runs of the named file", () => {
  assert.match(yaml, /require-ci-workflow:\n\s+description:[^\n]*\n\s+type: string\n\s+default: ""/);
  assert.match(yaml, /name: CI has succeeded on this commit\n\s+if: inputs\.require-ci-workflow != ''/);
  assert.match(yaml, /CI_WORKFLOW: \$\{\{ inputs\.require-ci-workflow \}\}/);
  const r = run([{ code: 200, body: { workflow_runs: [runOf("completed", "success")] } }]);
  assert.equal(r.status, 0, r.out);
  assert.equal(r.calls.length, 1);
  assert.match(r.calls[0], /^token https:\/\/api\.github\.com\/repos\/johnmorrisdotca\/example\/actions\/workflows\/ci\.yml\/runs\?head_sha=abc123/);
});

test("a commit whose CI succeeded is released", () => {
  const r = run([{ code: 200, body: { workflow_runs: [runOf("completed", "success")] } }]);
  assert.equal(r.status, 0, r.out);
});

test("a green rerun counts even when an earlier run of the same commit was red", () => {
  const r = run([{ code: 200, body: { workflow_runs: [runOf("completed", "success"), runOf("completed", "failure")] } }]);
  assert.equal(r.status, 0, r.out);
});

test("a red commit is refused", () => {
  const r = run([{ code: 200, body: { workflow_runs: [runOf("completed", "failure")] } }]);
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /ci\.yml has not succeeded on abc123/);
});

test("a commit whose CI is still running, or never ran, is refused", () => {
  for (const runs of [[runOf("in_progress", null)], [runOf("queued", null)], []]) {
    const r = run([{ code: 200, body: { workflow_runs: runs } }]);
    assert.equal(r.status, 1, r.out);
  }
});

test("a token the API refuses is followed by a plain ask, which a public repository answers", () => {
  const r = run([{ code: 403 }, { code: 200, body: { workflow_runs: [runOf("completed", "success")] } }]);
  assert.equal(r.status, 0, r.out);
  assert.deepEqual(r.calls.map((c) => c.split(" ")[0]), ["token", "anonymous"]);
});

test("runs that cannot be read at all refuse the release and say how a private repository fixes it", () => {
  const r = run([{ code: 404 }]);
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /Could not read the runs of ci\.yml \(HTTP 404\)/);
  assert.match(r.out, /actions: read/);
});

test("kazoku-ui's own release asks for it", () => {
  assert.match(readFileSync(new URL("../.github/workflows/release.yml", import.meta.url), "utf8"), /require-ci-workflow: ci\.yml/);
});

test("the release job ends at 120 minutes", () => {
  assert.match(yaml, /release:\n {4}runs-on: ubuntu-latest\n {4}# [^\n]+\n {4}timeout-minutes: 120\n/);
});

test("the freeze test installs Chromium through the bounded action, not install --with-deps", () => {
  assert.doesNotMatch(yaml, /playwright install --with-deps/);
  assert.match(yaml, /name: Browsers for the freeze test\n {8}if: env\.ON_NPM == 'no' && inputs\.freeze-command != ''\n {8}uses: johnmorrisdotca\/kazoku-ui\/\.github\/actions\/playwright@v0\.41\.0\n {8}with:\n {10}browsers: chromium/);
  assert.match(yaml, /name: The freeze test \(packages with live 3D\)\n {8}if: env\.ON_NPM == 'no' && inputs\.freeze-command != ''\n {8}run: \$\{\{ inputs\.freeze-command \}\}/);
});
