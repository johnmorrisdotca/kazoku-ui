import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createTileStore,
  creditLine,
  loadRecords,
  MAX_IN_FLIGHT,
  MAX_RECORDS,
  TILE_BUDGET_BYTES,
  validateSource,
  type Credit,
  type RecordSource,
  type SourceInfo,
  type TileSource,
} from "../templates/data-door.ts";

const info = (id: string, change: Partial<SourceInfo> = {}): SourceInfo => ({
  id,
  name: { en: `Source ${id}`, ja: `ソース ${id}` },
  credit: { en: `Credit of ${id}`, ja: `${id}のクレジット` },
  licence: { name: "CC0 1.0", url: "https://creativecommons.org/publicdomain/zero/1.0/" },
  url: `https://example.org/${id}`,
  retrieved: "2026-11-10",
  ...change,
});
const records = <R>(id: string, list: R[] | (() => R[] | Promise<R[]>)): RecordSource<R> => ({ kind: "records", info: info(id), records: typeof list === "function" ? list : () => list });

/** A tile source of `size`-byte tiles whose loads the test settles by hand. */
function fakeTiles(id: string, size = 10) {
  const pending = new Map<string, { resolve: (tile: { key: string }) => void; reject: (error: Error) => void; signal: AbortSignal }>();
  const calls: string[] = [];
  const source: TileSource<string, number, { key: string }> = {
    kind: "tiles",
    info: info(id),
    need: (place, detail) => Array.from({ length: detail }, (_, n) => `${place}/${n}`),
    load: (key, signal) =>
      new Promise((resolve, reject) => {
        calls.push(key);
        pending.set(key, { resolve, reject, signal });
        signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      }),
    bytes: () => size,
  };
  const settle = (key: string): void => pending.get(key)?.resolve({ key });
  return { source, calls, pending, settle };
}
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

test("validateSource accepts a complete source of either kind", () => {
  validateSource(records("mine", [1, 2]));
  validateSource(fakeTiles("tiles").source);
});

test("validateSource refuses an empty credit, in either language, and an empty name", () => {
  for (const language of ["en", "ja"] as const) {
    const source = { ...records("mine", []), info: info("mine", { credit: { en: "x", ja: "x", [language]: "  " } }) };
    assert.throws(() => validateSource(source), new RegExp(`credit is empty \\(${language}\\)`));
  }
  assert.throws(() => validateSource({ ...records("mine", []), info: info("mine", { name: { en: "", ja: "名前" } }) }), /name is empty \(en\)/);
});

test("validateSource refuses a licence with no name, no link or a link that is not a web address", () => {
  const licence = (change: object) => ({ ...records("mine", []), info: info("mine", { licence: { name: "CC0 1.0", url: "https://example.org/licence", ...change } }) });
  assert.throws(() => validateSource(licence({ name: "" })), /licence has no name/);
  assert.throws(() => validateSource(licence({ url: "" })), /licence has no link/);
  assert.throws(() => validateSource(licence({ url: "javascript:alert(1)" })), /licence has no link/);
  assert.throws(() => validateSource({ ...records("mine", []), info: { ...info("mine"), licence: undefined } }), /there is no licence/);
  assert.throws(() => validateSource(licence({ nonCommercial: "yes" })), /nonCommercial must be true or false/);
});

test("validateSource refuses a bad id and an id already used in the view", () => {
  for (const id of ["", "Upper", "has space", "-lead", "x".repeat(65)]) assert.throws(() => validateSource(records(id, [])), /id must be/, JSON.stringify(id));
  assert.throws(() => validateSource(records("ucac4", []), ["ucac4"]), /source "ucac4": the id is already used in this view/);
  validateSource(records("ucac4", []), ["other"]);
});

test("validateSource refuses what is not a source, a bad day, a bad page and a missing function", () => {
  assert.throws(() => validateSource(null), TypeError);
  assert.throws(() => validateSource("source"), TypeError);
  assert.throws(() => validateSource({ kind: "records" }), /needs an info object/);
  assert.throws(() => validateSource({ ...records("mine", []), info: info("mine", { retrieved: "2026-02-30" }) }), /real day/);
  assert.throws(() => validateSource({ ...records("mine", []), info: info("mine", { retrieved: "yesterday" }) }), /real day/);
  assert.throws(() => validateSource({ ...records("mine", []), info: info("mine", { url: "" }) }), /no page/);
  assert.throws(() => validateSource({ kind: "records", info: info("mine") }), /needs records\(\)/);
  assert.throws(() => validateSource({ kind: "tiles", info: info("mine"), need: () => [], load: () => Promise.resolve(1) }), /needs bytes\(\)/);
  assert.throws(() => validateSource({ kind: "maps", info: info("mine") }), /kind must be/);
});

const credit = (id: string, own: boolean, change: Partial<SourceInfo> = {}): Credit => ({ source: info(id, change), own, used: 1 });

test("creditLine puts the package's own first, always names the licence and says non-commercial and share-alike", () => {
  const list = [
    credit("survey", false, { licence: { name: "CC BY-NC 3.0 IGO", url: "https://example.org/l", nonCommercial: true }, credit: { en: "A survey", ja: "サーベイ" } }),
    credit("yale", true, { licence: { name: "Public domain", url: "https://example.org/pd" }, credit: { en: "Yale Bright Star Catalogue", ja: "イェール輝星カタログ" } }),
    credit("sa", false, { licence: { name: "CC BY-SA 4.0", url: "https://example.org/sa", shareAlike: true, nonCommercial: true }, credit: { en: "A share-alike set", ja: "同一条件のデータ" } }),
  ];
  assert.equal(creditLine(list, "en"), "Yale Bright Star Catalogue (Public domain); A survey (CC BY-NC 3.0 IGO; non-commercial); A share-alike set (CC BY-SA 4.0; non-commercial, share-alike).");
  assert.equal(creditLine(list, "ja"), "イェール輝星カタログ（パブリックドメイン）／サーベイ（CC BY-NC 3.0 IGO、非営利のみ）／同一条件のデータ（CC BY-SA 4.0、非営利のみ、同一条件で共有）");
});

test("creditLine writes a source once, is empty for none and falls back to English", () => {
  assert.equal(creditLine([], "en"), "");
  assert.equal(creditLine([], "ja"), "");
  const one = credit("a", false);
  assert.equal(creditLine([one, { ...one, used: 5 }], "en"), "Credit of a (CC0 1.0).");
  const blank = credit("b", true, { credit: { en: "English only", ja: "" } });
  assert.equal(creditLine([blank], "ja"), "English only（CC0 1.0）");
});

test("creditLine names a licence in Japanese: the source's own nameJa first, then a phrase the door knows, and an identifier stays", () => {
  const ucac4 = credit("ucac4", true, { licence: { name: "UCAC4 terms of use", nameJa: "UCAC4の利用条件", url: "https://example.org/u" }, credit: { en: "UCAC4", ja: "UCAC4" } });
  const told = credit("told", false, { licence: { name: "Published for use with credit", url: "https://example.org/p" }, credit: { en: "A table", ja: "表" } });
  const cc = credit("cc", false, { licence: { name: "CC BY 4.0", url: "https://example.org/cc" }, credit: { en: "A map", ja: "地図" } });
  assert.equal(creditLine([ucac4, told, cc], "ja"), "UCAC4（UCAC4の利用条件）／表（出典を示せば利用可）／地図（CC BY 4.0）");
  assert.equal(creditLine([ucac4, told, cc], "en"), "UCAC4 (UCAC4 terms of use); A table (Published for use with credit); A map (CC BY 4.0).");
});

test("a licence's Japanese name, when there is one, may not be empty", () => {
  const withName = (nameJa: string) => ({ kind: "records" as const, info: info("mine", { licence: { name: "Terms", nameJa, url: "https://example.org/t" } }), records: () => [] });
  assert.throws(() => validateSource(withName("  ")), /Japanese name/);
  assert.doesNotThrow(() => validateSource(withName("利用条件")));
});

test("loadRecords freezes the list and counts a record with a NaN, an infinity or a throw", async () => {
  const source = records("mine", [{ ra: 1, dec: 2 }, { ra: Number.NaN, dec: 2 }, { ra: 3, dec: Infinity }, { ra: 4, dec: 5 }, null as never]);
  const read = await loadRecords(source, new AbortController().signal, (star) => [star.ra, star.dec]);
  assert.equal(read.status, "ok");
  assert.deepEqual(read.records, [{ ra: 1, dec: 2 }, { ra: 4, dec: 5 }]);
  assert.equal(read.skipped, 3);
  assert.ok(Object.isFrozen(read.records));
  const thrown = await loadRecords(records("mine", [{ ra: 1 }, { ra: 2 }]), new AbortController().signal, (star) => {
    if (star.ra === 2) throw new Error("bad record");
    return [star.ra];
  });
  assert.deepEqual([thrown.records.length, thrown.skipped], [1, 1]);
});

test("loadRecords reads a Promise, refuses over the cap, and never throws", async () => {
  const signal = new AbortController().signal;
  assert.equal((await loadRecords(records("mine", async () => [1, 2, 3]), signal)).records.length, 3);
  const exactly = await loadRecords(records("mine", () => new Array<number>(MAX_RECORDS).fill(1)), signal);
  assert.equal(exactly.status, "ok");
  const over = await loadRecords(records("mine", () => new Array<number>(MAX_RECORDS + 1).fill(1)), signal);
  assert.equal(over.status, "failed");
  assert.match(over.reason ?? "", /must be tiles/);
  assert.equal(over.records.length, 0);
  const throws = await loadRecords(records("mine", () => { throw new Error("offline"); }), signal);
  assert.deepEqual([throws.status, throws.reason], ["failed", "offline"]);
  const rejects = await loadRecords(records("mine", () => Promise.reject(new Error("refused"))), signal);
  assert.equal(rejects.status, "failed");
  const notList = await loadRecords(records("mine", (() => ({ a: 1 })) as never), signal);
  assert.equal(notList.status, "failed");
});

test("loadRecords reports an abort, before and during the read", async () => {
  const before = new AbortController();
  before.abort();
  assert.equal((await loadRecords(records("mine", [1]), before.signal)).status, "aborted");
  const during = new AbortController();
  const read = loadRecords(records("mine", () => new Promise<number[]>((resolve) => setTimeout(() => resolve([1]), 5))), during.signal);
  during.abort();
  assert.equal((await read).status, "aborted");
});

test("a store loads what a view needs, holds it, and sends nothing when asked again at rest", async () => {
  const { source, calls, settle } = fakeTiles("t");
  const store = createTileStore<{ key: string }>();
  const keys = source.need("a", 3);
  assert.equal(store.want(source, keys).size, 0);
  assert.equal(store.stats().inFlight, 3);
  for (const key of keys) settle(key);
  await store.idle();
  assert.equal(store.want(source, keys).size, 3);
  assert.equal(store.get("t", "a/1")?.key, "a/1");
  const before = store.stats().requested;
  for (let n = 0; n < 50; n++) store.want(source, keys);
  assert.equal(store.stats().requested, before, "at rest nothing is sent");
  assert.equal(calls.length, 3);
});

test("a store runs at most six loads for a source and starts the next as one finishes", async () => {
  const { source, pending, calls, settle } = fakeTiles("t");
  const store = createTileStore<{ key: string }>();
  store.want(source, source.need("a", 10));
  assert.equal(MAX_IN_FLIGHT, 6);
  assert.deepEqual([store.stats().inFlight, store.stats().queued], [6, 4]);
  settle("a/0");
  await flush();
  assert.deepEqual([store.stats().inFlight, store.stats().queued], [6, 3]);
  for (const key of [...pending.keys()]) settle(key);
  for (let n = 0; n < 12; n++) {
    await flush();
    for (const key of [...pending.keys()]) settle(key);
  }
  await store.idle();
  assert.equal(calls.length, 10);
  assert.equal(store.stats().held, 10);
});

test("a tile that throws, rejects, comes back empty or has no size is counted and never held", async () => {
  let changes = 0;
  const store = createTileStore<number | null>({ onChange: () => (changes += 1) });
  const plan: Record<string, () => Promise<number | null>> = {
    throws: () => { throw new Error("sync"); },
    rejects: () => Promise.reject(new Error("network")),
    empty: () => Promise.resolve(null),
    nan: () => Promise.resolve(Number.NaN),
    fine: () => Promise.resolve(5),
  };
  const source: TileSource<null, null, number | null> = { kind: "tiles", info: info("odd"), need: () => Object.keys(plan), load: (key) => plan[key]!(), bytes: (tile) => (tile === null ? 0 : tile) };
  store.want(source, source.need(null, null));
  await store.idle();
  const stats = store.stats();
  assert.deepEqual([stats.failed, stats.held, stats.heldBytes], [4, 1, 5]);
  assert.equal(store.get("odd", "nan"), undefined);
  assert.ok(changes >= 5);
});

test("a tile whose bytes() throws or is negative is counted as failed", async () => {
  const store = createTileStore<number>();
  const source: TileSource<null, null, number> = {
    kind: "tiles",
    info: info("sized"),
    need: () => ["a", "b", "c"],
    load: () => Promise.resolve(1),
    bytes: (() => {
      let n = 0;
      return () => {
        n += 1;
        if (n === 1) throw new Error("no size");
        return n === 2 ? -4 : 8;
      };
    })(),
  };
  store.want(source, source.need(null, null));
  await store.idle();
  assert.deepEqual([store.stats().failed, store.stats().held], [2, 1]);
});

test("a failed tile is tried again only when the view changes, not at rest", async () => {
  let fail = true;
  const store = createTileStore<number>();
  const source: TileSource<null, null, number> = { kind: "tiles", info: info("retry"), need: () => ["a"], load: () => (fail ? Promise.reject(new Error("x")) : Promise.resolve(1)), bytes: () => 1 };
  store.want(source, ["a"]);
  await store.idle();
  fail = false;
  for (let n = 0; n < 20; n++) store.want(source, ["a"]);
  await store.idle();
  assert.deepEqual([store.stats().requested, store.stats().held], [1, 0]);
  store.want(source, ["a", "b"]);
  await store.idle();
  assert.equal(store.get("retry", "a"), 1, "the change sent it again");
});

test("want with again tries what is missing once more with the same keys, and never twice at once", async () => {
  let fail = true;
  let calls = 0;
  const store = createTileStore<number>();
  const source: TileSource<null, null, number> = { kind: "tiles", info: info("again"), need: () => ["a", "b"], load: (key) => (calls++, key === "a" && fail ? Promise.reject(new Error("x")) : Promise.resolve(1)), bytes: () => 1 };
  store.want(source, ["a", "b"]);
  await store.idle();
  assert.deepEqual([calls, store.stats().held, store.stats().failed], [2, 1, 1]);
  fail = false;
  store.want(source, ["a", "b"]);
  assert.equal(calls, 2, "without again, nothing is sent");
  store.want(source, ["a", "b"], true);
  store.want(source, ["a", "b"], true);
  await store.idle();
  assert.deepEqual([calls, store.stats().held], [3, 2], "only the missing one, once");
});

test("the byte budget holds: held bytes are never over it, the oldest unneeded tile goes first, a needed tile is never let go", async () => {
  const { source, settle } = fakeTiles("t", 10);
  const store = createTileStore<{ key: string }>({ budgetBytes: 50 });
  const drawn = async (keys: string[]) => {
    store.want(source, keys);
    for (const key of keys) settle(key);
    await store.idle();
    assert.ok(store.stats().heldBytes <= 50, `held ${store.stats().heldBytes}`);
  };
  await drawn(["a", "b", "c", "d", "e"]);
  assert.equal(store.stats().heldBytes, 50);
  await drawn(["f", "g"]);
  assert.equal(store.stats().evicted, 2);
  assert.equal(store.get("t", "a"), undefined, "the least recently used went first");
  assert.equal(store.get("t", "b"), undefined);
  assert.ok(store.get("t", "c") && store.get("t", "g"));
});

test("more tiles needed than the budget fits: the view keeps what it holds, the rest are refused and counted", async () => {
  const { source, settle } = fakeTiles("t", 10);
  const store = createTileStore<{ key: string }>({ budgetBytes: 40 });
  const keys = Array.from({ length: 12 }, (_, n) => `k${n}`);
  store.want(source, keys);
  for (let round = 0; round < 6; round++) {
    for (const key of keys) settle(key);
    await flush();
  }
  await store.idle();
  const stats = store.stats();
  assert.equal(stats.heldBytes, 40);
  assert.equal(stats.held, 4);
  assert.equal(stats.refused, 8);
  assert.equal(stats.evicted, 0, "a tile the view needs is never let go");
});

test("maxTiles caps the count as well as the bytes, and never lets go of a tile the view needs", async () => {
  const { source, settle } = fakeTiles("t", 1);
  const store = createTileStore<{ key: string }>({ maxTiles: 2 });
  store.want(source, ["a", "b", "c"]);
  for (const key of ["a", "b", "c"]) settle(key);
  await store.idle();
  assert.deepEqual([store.stats().held, store.stats().refused, store.stats().evicted], [2, 1, 0]);
  store.want(source, ["c", "d"]);
  settle("c");
  settle("d");
  await store.idle();
  assert.deepEqual([store.stats().held, store.stats().evicted], [2, 2], "a and b, which nobody needs, went to make room");
  assert.ok(store.get("t", "c") && store.get("t", "d"));
});

test("a tile bigger than the whole budget is refused", async () => {
  const { source, settle } = fakeTiles("t", 100);
  const store = createTileStore<{ key: string }>({ budgetBytes: 50 });
  store.want(source, ["a"]);
  settle("a");
  await store.idle();
  assert.deepEqual([store.stats().held, store.stats().refused, store.stats().heldBytes], [0, 1, 0]);
});

test("the budget is shared by all sources and is 48 MB by default", async () => {
  assert.equal(TILE_BUDGET_BYTES, 48 * 1024 * 1024);
  const one = fakeTiles("one", 10);
  const two = fakeTiles("two", 10);
  const store = createTileStore<{ key: string }>({ budgetBytes: 30 });
  store.want(one.source, ["a", "b"]);
  one.settle("a");
  one.settle("b");
  await store.idle();
  store.want(two.source, ["a", "b"]);
  two.settle("a");
  two.settle("b");
  await store.idle();
  assert.ok(store.stats().heldBytes <= 30);
  assert.equal(store.stats().held, 3);
  assert.equal(store.stats().refused, 1, "every tile held is needed by a source, so the last to arrive does not fit");
  assert.equal(store.get("two", "b"), undefined);
  assert.equal(store.get("one", "b")?.key, "b");
  store.want(one.source, ["a"]); // the first view moves: "b" is no longer needed, so the second source can have room
  store.want(two.source, ["b"]);
  two.settle("b");
  await store.idle();
  assert.equal(store.get("two", "b")?.key, "b");
  assert.ok(store.stats().heldBytes <= 30);
});

test("drop aborts a source's loads, frees its tiles and leaves the others", async () => {
  const one = fakeTiles("one");
  const two = fakeTiles("two");
  const store = createTileStore<{ key: string }>();
  store.want(one.source, ["a", "b", "c"]);
  store.want(two.source, ["a"]);
  one.settle("a");
  two.settle("a");
  await flush();
  assert.equal(store.stats().held, 2);
  store.drop("one");
  assert.equal(one.pending.get("b")?.signal.aborted, true);
  assert.equal(one.pending.get("c")?.signal.aborted, true);
  assert.deepEqual([store.stats().held, store.stats().heldBytes, store.stats().inFlight, store.stats().queued], [1, 10, 0, 0]);
  one.settle("b");
  await store.idle();
  assert.equal(store.get("one", "b"), undefined, "a tile that arrives after drop is not kept");
  assert.equal(store.stats().failed, 0, "an abort is not a failure");
  store.drop("one");
  store.drop("never-added");
  assert.equal(store.get("two", "a")?.key, "a");
});

test("a view that moves aborts the loads it no longer needs and keeps the ones it does", async () => {
  const { source, pending, settle } = fakeTiles("t");
  const store = createTileStore<{ key: string }>();
  store.want(source, ["a", "b", "c"]);
  store.want(source, ["c", "d"]);
  assert.equal(pending.get("a")?.signal.aborted, true);
  assert.equal(pending.get("b")?.signal.aborted, true);
  assert.equal(pending.get("c")?.signal.aborted, false);
  settle("c");
  settle("d");
  await store.idle();
  assert.deepEqual([store.stats().held, store.stats().failed], [2, 0]);
});

test("idle resolves at once when nothing is loading", async () => {
  await createTileStore().idle();
});
