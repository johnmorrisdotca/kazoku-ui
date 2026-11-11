// The documentation check's reading of a guide's front matter (scripts/docs.mjs): as strict as YAML, so a guide that GitHub shows "Error in user YAML" above fails
// `pnpm docs:check` here first. The same cases as the family's docs-site.mjs holds in each package that has a generated site.
import assert from "node:assert/strict";
import { test } from "node:test";

interface FrontMatter { data: Record<string, string> | null; body: string; problems: { line: number; text: string }[] }
const { parseFrontMatter } = (await import(new URL("../scripts/docs.mjs", import.meta.url).href)) as { parseFrontMatter(text: string): FrontMatter };

const guide = (...lines: string[]) => `---\n${lines.join("\n")}\n---\n\n## Body\n`;

test("front matter is read as YAML is: a quoted colon passes, in double or single quotes, and keeps its text", () => {
  const read = parseFrontMatter(guide('title: "Maps: a guide"', "section: how-to", "order: 2", "description: 'It''s one sentence: with a colon.'"));
  assert.deepEqual(read.problems, []);
  assert.deepEqual(read.data, { title: "Maps: a guide", section: "how-to", order: "2", description: "It's one sentence: with a colon." });
  assert.equal(read.body, "\n## Body\n");
  assert.deepEqual(parseFrontMatter(guide('title: "Say \\"hi\\" # not a comment"', "description: A plain sentence, with a hash#inside and a colon:inside.")).problems, []);
  assert.equal(parseFrontMatter("## No front matter\n").data, null);
});

test("front matter with an unquoted colon fails, naming the line", () => {
  const read = parseFrontMatter(guide("title: Maps: a guide", "section: how-to", "description: Fine."));
  assert.equal(read.problems.length, 1);
  assert.equal(read.problems[0].line, 2);
  assert.match(read.problems[0].text, /title has a colon followed by a space/);
  assert.equal(parseFrontMatter(guide("title: Fine", "description: Ends in a colon:")).problems[0].line, 3);
});

test("front matter with a tab or a bad indent fails", () => {
  const tab = parseFrontMatter(guide("title: Fine", "\tdescription: Tabbed."));
  assert.equal(tab.problems.length, 1);
  assert.equal(tab.problems[0].line, 3);
  assert.match(tab.problems[0].text, /tab/);
  const indent = parseFrontMatter(guide("title: Fine", "description: Two lines", "  of one sentence."));
  assert.equal(indent.problems.length, 1);
  assert.equal(indent.problems[0].line, 4);
  assert.match(indent.problems[0].text, /indented/);
  assert.equal(parseFrontMatter(guide(" title: Fine")).problems[0].line, 2);
});

test("front matter also fails on a value YAML reads as syntax, a hash that starts a comment, a key twice, an open quote and a key with no space", () => {
  for (const line of ["title: [draft] Maps", "title: *Maps*", "title: & Maps", "title: !Maps", "title: > Maps", "title: | Maps", "title: %Maps", "title: @Maps", "title: `Maps`", "title: - Maps", "title: Maps # draft", 'title: "Maps', 'title: "Maps" and more', "title: 'Maps", "title:Maps", 'title: "bad \\q escape"']) {
    assert.equal(parseFrontMatter(guide(line)).problems.length, 1, line);
  }
  assert.match(parseFrontMatter(guide("title: One", "title: Two")).problems[0].text, /second time/);
  assert.deepEqual(parseFrontMatter(guide("# a comment", "", "title: Fine")).problems, []);
});
