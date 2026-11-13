import assert from "node:assert/strict";
import { test } from "node:test";

import { actionsFit, actionsOf, announcement, chipsOf, isActionEnabled, planLines, stepIndex, toggleAnnouncement, type SearchGroup } from "../src/search-box/model.ts";
import { iconPaths, isSafePath, SEARCH_ICONS } from "../src/search-box/icons.ts";
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

test("folding keeps voiced kana apart, treats a letter and its combining marks as one, and highlights whole characters", () => {
  // か and が are different letters; a half-width letter and its voiced mark are one
  assert.equal(rank("か", "がく"), RANK.none);
  assert.equal(rank("ぱ", "ﾊﾟｸ"), RANK.prefix);
  assert.equal(rank("が", "ｶﾞｸ"), RANK.prefix);
  assert.equal(rank("etoile", "e\u0301toile"), RANK.exact);
  // the accent of a decomposed letter stays inside the marked part, and a surrogate pair is not cut
  assert.deepEqual(highlight("e\u0301cole", "e").map((part) => part.text), ["e\u0301", "col", "e"]);
  assert.deepEqual(highlight("ｶﾞｸ", "が").map((part) => [part.text, part.match]), [["ｶﾞ", true], ["ｸ", false]]);
  assert.deepEqual(highlight("Ｅ\u0301x", "ｅ").map((part) => [part.text, part.match]), [["Ｅ\u0301", true], ["x", false]]);
  assert.deepEqual(highlight("a😀b😀c", "😀").filter((part) => part.match).map((part) => part.text), ["😀", "😀"]);
  assert.equal(highlight("Straße ﬁsh", "fi").map((part) => part.text).join(""), "Straße ﬁsh");
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
  assert.equal(announcement(WORDS.ja, [group("a", 3, 1)]), "3件：A3件");
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

test("a source that throws at once, or answers without a promise, is handled", async () => {
  const answers: string[] = [];
  const failures: unknown[] = [];
  let calls = 0;
  const runner = createSearchRunner({
    debounceMs: 0,
    source: () => (query) => {
      calls += 1;
      if (query === "boom") throw new Error("sync");
      return [{ id: query, label: query, total: 1, rows: [] }];
    },
    onAnswer: (groups) => answers.push(groups.map((one) => one.id).join(",")),
    onFail: (error) => failures.push(error),
  });
  runner.request("boom");
  await tick();
  assert.equal((failures[0] as Error).message, "sync");
  assert.equal(runner.busy, false);
  runner.request("ok");
  await tick();
  assert.deepEqual(answers, ["ok"]);
  assert.equal(calls, 2);
  assert.equal(runner.busy, false);
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

test("a toggle's change is said as the action, the row, then on or off, in each language", () => {
  assert.equal(toggleAnnouncement(WORDS.en, "Favourite", "Mars", true), "Favourite Mars, on");
  assert.equal(toggleAnnouncement(WORDS.en, "Favourite", "Mars", false), "Favourite Mars, off");
  assert.equal(toggleAnnouncement(WORDS.ja, "お気に入り", "火星", true), "お気に入り 火星、オン");
  assert.equal(toggleAnnouncement(WORDS.ja, "お気に入り", "火星", false), "お気に入り 火星、オフ");
  assert.equal(toggleAnnouncement(wordsFor("en", { on: "starred", off: "unstarred" }), "Favourite", "Mars", true), "Favourite Mars, starred");
  assert.notEqual(WORDS.en.on, WORDS.en.off);
  assert.notEqual(WORDS.ja.on, WORDS.ja.off);
});

test("an action can be done unless the page disabled it, and a row keeps a disabled action in place", () => {
  assert.equal(isActionEnabled({ id: "go", label: "Go" }), true);
  assert.equal(isActionEnabled({ id: "go", label: "Go", disabled: false }), true);
  assert.equal(isActionEnabled({ id: "go", label: "Go", disabled: true, title: "Not yet" }), false);
  const actions = actionsOf({ id: "a", label: "A", actions: [{ id: "go", label: "Go", disabled: true, title: "Not yet" }, { id: "fav", label: "Fav", pressed: false }] });
  assert.deepEqual(actions.map((one) => one.id), ["go", "fav"]);
  assert.equal(actions[0]?.title, "Not yet");
});

test("actionsFit keeps every action when they fit, and puts the last ones behind one button when they do not", () => {
  // three icon buttons of 30 with 4 between: 98
  assert.equal(actionsFit(98, [30, 30, 30], 30, 4), 3);
  assert.equal(actionsFit(500, [30, 30, 30], 30, 4), 3);
  // a pixel short: two actions and the button would need 98 too, so one stays and the rest go behind "more" (30 + 4 + 30 = 64)
  assert.equal(actionsFit(97, [30, 30, 30], 30, 4), 1);
  assert.equal(actionsFit(64, [30, 30, 30], 30, 4), 1);
  // text buttons of different widths: the first two (60 + 4 + 40 = 104) and the button (4 + 30) need 138
  assert.equal(actionsFit(138, [60, 40, 70], 30, 4), 2);
  assert.equal(actionsFit(137, [60, 40, 70], 30, 4), 1);
  // never fewer than the first action, and a lone action is never put behind "more"
  assert.equal(actionsFit(10, [60, 40, 70], 30, 4), 1);
  assert.equal(actionsFit(10, [60], 30, 4), 1);
  assert.equal(actionsFit(10, [], 30, 4), 0);
  // a smaller button for "more" than for an action lets one more action stay
  assert.equal(actionsFit(97, [30, 30, 30], 20, 4), 3 - 1);
  assert.equal(actionsFit(60, [30, 30, 30], 20, 4), 1);
});

test("an action's icon is a built-in name or the page's own safe path data, and anything else is the dot", () => {
  assert.equal(iconPaths(undefined), undefined);
  assert.deepEqual(iconPaths("star"), SEARCH_ICONS.star);
  assert.deepEqual(iconPaths("eye"), SEARCH_ICONS.show);
  assert.deepEqual(iconPaths("arrow"), SEARCH_ICONS.go);
  assert.deepEqual(iconPaths("dot"), SEARCH_ICONS.dot);
  // a name nobody knows is seen as the dot, not dropped
  assert.deepEqual(iconPaths("starr" as "star"), SEARCH_ICONS.dot);
  assert.deepEqual(iconPaths({ path: "M4 12h16" }), ["M4 12h16"]);
  assert.deepEqual(iconPaths({ path: ["M4 12h16", "M12 4v16"] }), ["M4 12h16", "M12 4v16"]);
  assert.deepEqual(iconPaths({ path: "M-4.5 1e2 l.5,-2z" }), ["M-4.5 1e2 l.5,-2z"]);
  // markup, quotes, urls and scripts are not path data
  assert.equal(isSafePath('M0 0h1" onload="x'), false);
  assert.equal(isSafePath("M0 0<script>"), false);
  assert.equal(isSafePath("url(#a)"), false);
  assert.equal(isSafePath(""), false);
  assert.equal(isSafePath(`M0 0${"h1".repeat(500)}`), false);
  assert.deepEqual(iconPaths({ path: 'M0 0" onload="x' }), SEARCH_ICONS.dot);
  assert.deepEqual(iconPaths({ path: ["M0 0h1", "<svg>"] }), SEARCH_ICONS.dot);
  assert.deepEqual(iconPaths({ path: [] }), SEARCH_ICONS.dot);
  assert.deepEqual(iconPaths({} as { path: string }), SEARCH_ICONS.dot);
});

test("the words for the button that holds the extra actions are in both languages", () => {
  assert.equal(WORDS.en.more, "More actions");
  assert.equal(WORDS.ja.more, "その他の操作");
});
