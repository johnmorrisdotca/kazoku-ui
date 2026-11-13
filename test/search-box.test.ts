import assert from "node:assert/strict";
import { test } from "node:test";

import { actionsOf, announcement, chipsOf, planLines, stepIndex, type SearchGroup } from "../src/search-box/model.ts";
import { highlight, rank, RANK } from "../src/search-box/rank.ts";
import { createSearchRunner, type SearchTimers } from "../src/search-box/runner.ts";
import { WORDS, countPhrase, languageOf, wordsFor } from "../src/search-box/words.ts";

const group = (id: string, total: number, rows: number, extra: Partial<SearchGroup> = {}): SearchGroup => ({
  id,
  label: id.toUpperCase(),
  total,
  rows: Array.from({ length: rows }, (_, i) => ({ id: `${id}${i}`, label: `${id} ${i}` })),
  ...extra,
});

test("rank puts the whole name first, then a prefix, then a later word, then anywhere", () => {
  assert.equal(rank("mars", "Mars"), RANK.exact);
  assert.equal(rank("mar", "Mars"), RANK.prefix);
  assert.equal(rank("orb", "Mars Orbiter"), RANK.wordStart);
  assert.equal(rank("rbi", "Mars Orbiter"), RANK.contains);
  assert.equal(rank("zzz", "Mars"), RANK.none);
  assert.ok(RANK.exact > RANK.prefix && RANK.prefix > RANK.wordStart && RANK.wordStart > RANK.contains && RANK.contains > RANK.none);
  assert.equal(rank("", "Mars"), RANK.none);
  assert.equal(rank("   ", "Mars"), RANK.none);
  // a word after a hyphen, an apostrophe or a dot starts a word too
  assert.equal(rank("ray", "Cat's-ray"), RANK.wordStart);
  // a name that appears both inside a word and at a word start counts as the word start
  assert.equal(rank("an", "Banana Andes"), RANK.wordStart);
});

test("rank ignores case, accents, spacing, full-width forms and kana type, and counts aliases", () => {
  assert.equal(rank("MARS", "mars"), RANK.exact);
  assert.equal(rank("etoile", "Étoile"), RANK.exact);
  assert.equal(rank("  red   planet ", "Red Planet"), RANK.exact);
  assert.equal(rank("ｍａｒｓ", "Mars"), RANK.exact);
  assert.equal(rank("ＭＡＲ", "Mars"), RANK.prefix);
  assert.equal(rank("ﾄｳｷｮｳ", "トウキョウ"), RANK.exact);
  assert.equal(rank("とうきょう", "トウキョウ"), RANK.exact);
  assert.equal(rank("トウ", "とうきょう"), RANK.prefix);
  assert.equal(rank("がん", "ガン"), RANK.exact);
  assert.equal(rank("red", "Mars", ["Red Planet"]), RANK.prefix);
  assert.equal(rank("mars", "Mars", ["Red Planet"]), RANK.exact);
  assert.equal(rank("planet", "Mars", ["Red Planet"]), RANK.wordStart);
});

test("highlight cuts a name where the query matched and joins back to the same text", () => {
  assert.deepEqual(highlight("Mars Orbiter", "orb"), [
    { text: "Mars ", match: false },
    { text: "Orb", match: true },
    { text: "iter", match: false },
  ]);
  assert.deepEqual(highlight("Mars", "xyz"), [{ text: "Mars", match: false }]);
  assert.deepEqual(highlight("", "a"), []);
  assert.deepEqual(highlight("Mars", ""), [{ text: "Mars", match: false }]);
  // each word of a query that is not found whole
  const words = highlight("Red Mars Orbiter", "orbiter red");
  assert.deepEqual(words.filter((part) => part.match).map((part) => part.text), ["Red", "Orbiter"]);
  // the original letters come back, not the folded ones
  assert.deepEqual(highlight("Étoile", "etoi").map((part) => part.text), ["Étoi", "le"]);
  assert.deepEqual(highlight("ＭＡＲＳ", "ar").map((part) => part.text), ["Ｍ", "ＡＲ", "Ｓ"]);
  assert.deepEqual(highlight("トウキョウ", "きょ").filter((part) => part.match).map((part) => part.text), ["キョ"]);
  for (const [text, query] of [["Mars Orbiter", "ar"], ["Étoile du Nord", "nord é"], ["a😀b", "b"], ["aaaa", "aa"]] as const) {
    assert.equal(highlight(text, query).map((part) => part.text).join(""), text);
  }
});

test("the plan shows a few rows of each group and See all only where there are more", () => {
  const groups = [group("stars", 120, 5), group("planets", 2, 2), group("empty", 0, 0)];
  const lines = planLines(groups, "", 3, 20);
  assert.deepEqual(lines.map((line) => line.type), ["header", "row", "row", "row", "all", "header", "row", "row"]);
  // total counts results the source did not send: See all appears even when every sent row is drawn
  assert.deepEqual(planLines([group("stars", 9, 2)], "", 3, 20).map((line) => line.type), ["header", "row", "row", "all"]);
});

test("narrowed, the plan is one group's rows in windows with Show more while some are left", () => {
  const groups = [group("stars", 120, 50), group("planets", 4, 0)];
  const first = planLines(groups, "stars", 3, 20);
  assert.equal(first.filter((line) => line.type === "row").length, 20);
  assert.deepEqual(first.at(-1), { type: "more", group: groups[0], remaining: 30 });
  const all = planLines(groups, "stars", 3, 20, 60);
  assert.equal(all.filter((line) => line.type === "row").length, 50);
  assert.equal(all.some((line) => line.type === "more"), false);
  // only the narrowed group is drawn
  assert.equal(planLines(groups, "planets", 3, 20).length, 0);
});

test("actions: at most three, the first is the default, and a row with none has open", () => {
  const four = { id: "a", label: "A", actions: [1, 2, 3, 4].map((n) => ({ id: `x${n}`, label: `X${n}` })) };
  assert.deepEqual(actionsOf(four).map((action) => action.id), ["x1", "x2", "x3"]);
  assert.deepEqual(actionsOf({ id: "a", label: "A" }), [{ id: "open", label: "Open" }]);
  assert.deepEqual(actionsOf({ id: "a", label: "A", actions: [] }, "開く"), [{ id: "open", label: "開く" }]);
});

test("chips and the spoken count list each kind with its total", () => {
  const groups = [group("stars", 120, 5), group("planets", 2, 2), group("none", 0, 0)];
  assert.deepEqual(chipsOf(groups).map((chip) => [chip.id, chip.total]), [["stars", 120], ["planets", 2]]);
  assert.equal(announcement(WORDS.en, groups), "122 results: STARS 120, PLANETS 2");
  assert.equal(announcement(WORDS.en, [group("a", 1, 1)]), "1 result: A 1");
  assert.equal(announcement(WORDS.ja, [group("a", 3, 1)]), "3件：A 3");
  assert.equal(announcement(WORDS.en, []), "No matches");
});

test("the active row steps down and up, and leaves the list past either end", () => {
  assert.equal(stepIndex(-1, 3, 1), 0);
  assert.equal(stepIndex(-1, 3, -1), 2);
  assert.equal(stepIndex(0, 3, 1), 1);
  assert.equal(stepIndex(2, 3, 1), -1);
  assert.equal(stepIndex(0, 3, -1), -1);
  assert.equal(stepIndex(-1, 0, 1), -1);
});

/** A clock the test turns by hand, and a source whose answers the test releases one at a time. */
function rig(debounceMs = 100) {
  let now = 0;
  let next = 0;
  const timers = new Map<number, { at: number; run: () => void }>();
  const clock: SearchTimers = {
    set: (run, ms) => {
      next += 1;
      timers.set(next, { at: now + ms, run });
      return next;
    },
    clear: (handle) => void timers.delete(handle as number),
  };
  const calls: Array<{ query: string; group: string; signal: AbortSignal; resolve: (groups: SearchGroup[]) => void; reject: (error: unknown) => void }> = [];
  const answers: string[] = [];
  const failures: unknown[] = [];
  const runner = createSearchRunner({
    debounceMs,
    timers: clock,
    source: () => (query, { signal, group }) =>
      new Promise((resolve, reject) => {
        calls.push({ query, group, signal, resolve, reject });
      }),
    onAnswer: (groups, query, group) => answers.push(`${query}|${group}|${groups.map((one) => one.id).join(",")}`),
    onFail: (error) => failures.push(error),
  });
  const advance = (ms: number): void => {
    now += ms;
    for (const [id, timer] of [...timers]) if (timer.at <= now) { timers.delete(id); timer.run(); }
  };
  return { runner, calls, answers, failures, advance };
}
const tick = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

test("typing waits for the quiet time and asks the source once", () => {
  const { runner, calls, advance } = rig(100);
  runner.request("m");
  advance(60);
  runner.request("ma");
  advance(60);
  runner.request("mar");
  assert.equal(calls.length, 0);
  assert.equal(runner.busy, true);
  advance(99);
  assert.equal(calls.length, 0);
  advance(1);
  assert.deepEqual(calls.map((call) => call.query), ["mar"]);
});

test("an older, slower answer never replaces a newer one", async () => {
  const { runner, calls, answers, advance } = rig(0);
  runner.request("ma");
  runner.request("mars");
  assert.equal(calls.length, 2);
  // the newer call was made, so the older one was told to stop
  assert.equal(calls[0]?.signal.aborted, true);
  assert.equal(calls[1]?.signal.aborted, false);
  // the newer answer arrives first, then the older one, late
  calls[1]?.resolve([{ id: "new", label: "New", total: 1, rows: [] }]);
  await tick();
  calls[0]?.resolve([{ id: "old", label: "Old", total: 1, rows: [] }]);
  await tick();
  assert.deepEqual(answers, ["mars||new"]);
  advance(1000);
  assert.deepEqual(answers, ["mars||new"]);
  assert.equal(runner.busy, false);
});

test("an older answer is dropped even when the source ignores the abort and answers last", async () => {
  const { runner, calls, answers } = rig(0);
  runner.request("a");
  runner.request("ab");
  calls[1]?.resolve([{ id: "ab", label: "AB", total: 1, rows: [] }]);
  await tick();
  calls[0]?.resolve([{ id: "a", label: "A", total: 1, rows: [] }]);
  await tick();
  assert.deepEqual(answers, ["ab||ab"]);
});

test("a failure of an older call is not shown, and a failure of the newest is", async () => {
  const { runner, calls, failures } = rig(0);
  runner.request("a");
  runner.request("ab");
  calls[0]?.reject(new Error("old"));
  await tick();
  assert.deepEqual(failures, []);
  calls[1]?.reject(new Error("new"));
  await tick();
  assert.equal((failures[0] as Error).message, "new");
});

test("cancel drops the waiting request and aborts the one in flight, and a late answer is ignored", async () => {
  const { runner, calls, answers, advance } = rig(50);
  runner.request("a");
  runner.cancel();
  advance(500);
  assert.equal(calls.length, 0);
  runner.request("b", "stars", true);
  assert.equal(calls[0]?.group, "stars");
  runner.cancel();
  assert.equal(calls[0]?.signal.aborted, true);
  calls[0]?.resolve([]);
  await tick();
  assert.deepEqual(answers, []);
  assert.equal(runner.busy, false);
});

test("the labels are English or Japanese, every key is in both, and counts are phrased by language", () => {
  assert.equal(languageOf("ja-JP"), "ja");
  assert.equal(languageOf("en-CA"), "en");
  assert.equal(languageOf(null), "en");
  assert.deepEqual(Object.keys(WORDS.ja).sort(), Object.keys(WORDS.en).sort());
  assert.equal(wordsFor("en", { search: "Find" }).search, "Find");
  assert.equal(wordsFor("en", { search: "Find" }).empty, WORDS.en.empty);
  assert.equal(countPhrase(WORDS.en, 1), "1 result");
  assert.equal(countPhrase(WORDS.en, 12), "12 results");
  assert.equal(countPhrase(WORDS.ja, 12), "12件");
  for (const language of ["en", "ja"] as const) assert.ok(WORDS[language].seeAll.includes("{n}"));
});
