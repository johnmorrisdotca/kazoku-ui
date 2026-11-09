import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";

import { DEFAULT_MARGIN_MM, fitToPage, layoutOf, MIN_MARGIN_MM, PAGES, pageSize, printableSize } from "../src/print/pages.ts";
import { printCss } from "../src/print/css.ts";
import { BLOCKS, errorCorrection, MAX_BYTES, qrMatrix, qrSvg } from "../src/print/qr.ts";
import { cutMarks, tilePoster } from "../src/print/tile.ts";
import { TYPE_PRESETS } from "../src/print/type.ts";
import { languageOf, pageOf, WORDS, wordsFor } from "../src/print/words.ts";

test("the four paper sizes, in portrait and landscape", () => {
  assert.deepEqual(pageSize("a4"), { widthMm: 210, heightMm: 297 });
  assert.deepEqual(pageSize("letter"), { widthMm: 215.9, heightMm: 279.4 });
  assert.deepEqual(pageSize("a3"), { widthMm: 297, heightMm: 420 });
  assert.deepEqual(pageSize("tabloid"), { widthMm: 279.4, heightMm: 431.8 });
  assert.deepEqual(pageSize("a4", "landscape"), { widthMm: 297, heightMm: 210 });
  assert.deepEqual(Object.keys(PAGES), ["a4", "letter", "a3", "tabloid"]);
});

test("the printable area is the page less a margin on every side, and the margin is home-printer safe", () => {
  const area = printableSize("a4");
  assert.equal(area.widthMm, 210 - 2 * DEFAULT_MARGIN_MM);
  assert.equal(area.heightMm, 297 - 2 * DEFAULT_MARGIN_MM);
  assert.ok(DEFAULT_MARGIN_MM >= 10);
  assert.equal(printableSize("letter", "landscape", 10).widthMm, 279.4 - 20);
});

test("a layout falls back on anything it does not know, and never has a margin under the least", () => {
  assert.deepEqual(layoutOf(), { page: "a4", orientation: "portrait", marginMm: DEFAULT_MARGIN_MM, type: "kid", language: "en" });
  assert.equal(layoutOf({ page: "b5" as "a4" }).page, "a4");
  assert.equal(layoutOf({ orientation: "sideways" as "portrait" }).orientation, "portrait");
  assert.equal(layoutOf({ type: "huge" as "kid" }).type, "kid");
  assert.equal(layoutOf({ marginMm: 2 }).marginMm, MIN_MARGIN_MM);
  assert.equal(layoutOf({ marginMm: Number.NaN }).marginMm, DEFAULT_MARGIN_MM);
  assert.equal(layoutOf({ page: "letter", language: "ja", type: "normal", marginMm: 15 }).marginMm, 15);
});

test("a poster that fits a page is one page; a bigger one is tiled with an overlap", () => {
  assert.equal(tilePoster({ widthMm: 150, heightMm: 200, page: "a4" }).pages, 1);
  const plan = tilePoster({ widthMm: 400, heightMm: 300, page: "a4" });
  assert.deepEqual([plan.columns, plan.rows, plan.pages], [3, 2, 6]);
  assert.equal(plan.windowMm.widthMm, 210 - 2 * DEFAULT_MARGIN_MM);
  assert.deepEqual(plan.tiles.map((t) => t.index), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(plan.tiles.map((t) => [t.row, t.column]), [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]]);
  assert.equal(plan.tiles[1].xMm, 184.6 - 10);
  assert.equal(plan.tiles[2].xMm, 2 * (184.6 - 10));
  // Every page repeats exactly the overlap of its neighbour; the last column and row repeat nothing.
  assert.deepEqual(plan.tiles.map((t) => [t.overlapRightMm, t.overlapBottomMm]), [[10, 10], [10, 10], [0, 10], [10, 0], [10, 0], [0, 0]]);
});

test("every point of the poster is on some page, and a neighbour repeats the overlap", () => {
  for (const [w, h, page, overlap] of [[500, 700, "a4", 10], [841, 594, "letter", 12], [1200, 300, "a3", 5], [184.7, 271.5, "a4", 10]] as const) {
    const plan = tilePoster({ widthMm: w, heightMm: h, page, overlapMm: overlap });
    const xs = [...new Set(plan.tiles.map((t) => t.xMm))];
    const ys = [...new Set(plan.tiles.map((t) => t.yMm))];
    assert.equal(xs.length * ys.length, plan.pages);
    assert.equal(xs[0], 0);
    assert.ok(xs[xs.length - 1] + plan.windowMm.widthMm >= w - 1e-6, "the last column reaches the edge");
    assert.ok(ys[ys.length - 1] + plan.windowMm.heightMm >= h - 1e-6, "the last row reaches the edge");
    assert.ok(xs.length === 1 || xs[xs.length - 1] < w - overlap, "no page is only overlap");
    xs.forEach((x, i) => { if (i) assert.ok(Math.abs(xs[i - 1] + plan.windowMm.widthMm - x - overlap) < 1e-6); });
    ys.forEach((y, i) => { if (i) assert.ok(Math.abs(ys[i - 1] + plan.windowMm.heightMm - y - overlap) < 1e-6); });
  }
});

test("a poster that is a hair over a page still gets its second page", () => {
  assert.equal(tilePoster({ widthMm: 184.7, heightMm: 100, page: "a4" }).columns, 2);
  assert.equal(tilePoster({ widthMm: 184.6, heightMm: 100, page: "a4" }).columns, 1);
});

test("a poster of no size, or an overlap as big as a page, is refused", () => {
  assert.throws(() => tilePoster({ widthMm: 0, heightMm: 100, page: "a4" }), RangeError);
  assert.throws(() => tilePoster({ widthMm: 100, heightMm: Number.NaN, page: "a4" }), RangeError);
  assert.throws(() => tilePoster({ widthMm: 500, heightMm: 500, page: "a4", overlapMm: 200 }), RangeError);
  assert.throws(() => tilePoster({ widthMm: 500, heightMm: 500, page: "a4", overlapMm: -1 }), RangeError);
});

test("cut marks: two lines at each corner of the printable window, pointing out into the margin and on the page", () => {
  const marks = cutMarks("a4");
  assert.equal(marks.length, 8);
  const m = DEFAULT_MARGIN_MM;
  assert.deepEqual(marks[0], { x1: m - 1.5, y1: m, x2: m - 7.5, y2: m });
  for (const s of marks) for (const [x, y] of [[s.x1, s.y1], [s.x2, s.y2]]) assert.ok(x >= 0 && x <= 210 && y >= 0 && y <= 297);
});

test("the kid preset has names of at least 24 pt and lines of 1 to 1.5 mm, thicker than normal's; normal is smaller", () => {
  assert.ok(TYPE_PRESETS.kid.namePt >= 24);
  assert.ok(TYPE_PRESETS.kid.lineMm >= 1 && TYPE_PRESETS.kid.lineMm <= 1.5);
  assert.ok(TYPE_PRESETS.kid.lineMm > TYPE_PRESETS.normal.lineMm);
  assert.ok(TYPE_PRESETS.kid.bodyPt > TYPE_PRESETS.normal.bodyPt);
  assert.ok(TYPE_PRESETS.normal.namePt < TYPE_PRESETS.kid.namePt);
});

test("the print CSS names the paper, has no page margin of its own, and hides the page behind the print-only copy", () => {
  const css = printCss({ page: "letter", orientation: "landscape", marginMm: 15, type: "kid" });
  assert.match(css, /@page \{ size: 279\.4mm 215\.9mm; margin: 0; \}/);
  assert.match(css, /padding: 15mm/);
  assert.match(css, /body > :not\(\.kazoku-print-root\) \{ display: none !important; \}/);
  assert.match(css, /--kz-name: 28pt/);
  assert.match(css, /--kz-line: 1\.2mm/);
  // The Name is an underline (a bottom border only), not a box, in both presets.
  for (const type of ["kid", "normal"] as const) assert.match(printCss({ type }), /\.kazoku-namefield \{[^}]*border: 0; border-bottom: var\(--kz-line\) solid #000; border-radius: 0;/);
  assert.match(printCss({ type: "normal" }), /--kz-line: 0\.4mm/);
});

test("the words are in English and Japanese, every key in both, and the page number fills in", () => {
  assert.deepEqual(Object.keys(WORDS.ja).sort(), Object.keys(WORDS.en).sort());
  for (const language of ["en", "ja"] as const) for (const [key, value] of Object.entries(WORDS[language])) assert.ok(value.length > 0, `${language}.${key}`);
  assert.equal(pageOf(WORDS.en, 2, 6), "Page 2 of 6");
  assert.equal(pageOf(WORDS.ja, 2, 6), "2 / 6 ページ");
  assert.equal(languageOf("ja-JP"), "ja");
  assert.equal(languageOf("en-CA"), "en");
  assert.equal(wordsFor("en", { name: "Your name:" }).name, "Your name:");
});

// --- the QR code ---

const text = (m: boolean[][]): string => m.map((row) => row.map((v) => (v ? "#" : ".")).join("")).join("\n");
const sha = (m: boolean[][]): string => createHash("sha256").update(text(m)).digest("hex");

test("Reed-Solomon: the known error-correction codewords of the 'HELLO WORLD' 1-M example", () => {
  assert.deepEqual(errorCorrection([32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17], 10), [196, 35, 39, 119, 235, 215, 231, 226, 93, 23]);
});

test("every version's blocks add up to the standard's number of codewords", () => {
  BLOCKS.forEach(([ec, n1, d1, n2, d2], i) => {
    const v = i + 1;
    let bits = (16 * v + 128) * v + 64;
    if (v >= 2) { const n = Math.floor(v / 7) + 2; bits -= (25 * n - 10) * n - 55; if (v >= 7) bits -= 36; }
    assert.equal(n1 * (d1 + ec) + n2 * (d2 + ec), Math.floor(bits / 8), `version ${v}`);
  });
});

test("QR known answer: 'Hi' is the 21-module code a reference encoder draws, mask 0", () => {
  assert.equal(text(qrMatrix("Hi")), [
    "#######..##...#######", "#.....#.#.#...#.....#", "#.###.#...#.#.#.###.#", "#.###.#..#.##.#.###.#", "#.###.#.#..##.#.###.#", "#.....#....#..#.....#", "#######.#.#.#.#######",
    "..........#..........", "#.#.#.#.....#...#..#.", ".#..#..##..#.#.#.####", ".#.#######.#.###.####", ".....#.#######.###.#.", "####..#.##.#.###..#..", "........###...#...##.", "#######..#..#...#..##",
    "#.....#..##...#...###", "#.###.#.#.#.#.#.#.#.#", "#.###.#..###.#.#.#.#.", "#.###.#.#.##.###.##.#", "#.....#..#####.###.#.", "#######.#..#.###.####",
  ].join("\n"));
});

test("QR known answers: the hashes of codes a reference encoder drew, from version 2 (Japanese text) to version 20 (666 bytes), every mask chosen by the penalty rules", () => {
  assert.equal(sha(qrMatrix("https://johnmorrisdotca.github.io/kazoku-ui/print.html")), "98a0d56e8d765dafa29baaa7c320ef960c69c33215da26768492388c47a4e6af");
  assert.equal(sha(qrMatrix("日本語のテキスト")), "09ed81150cfdd3b1be699c0d6b4c5761443b4da9c9ca25f942aaefaa30b9d244");
  assert.equal(sha(qrMatrix("a".repeat(100))), "9dab43836af6eb933bc69854211b33d2b7aba942e20b183782b5c9f965abdc2e");
  assert.equal(sha(qrMatrix("b".repeat(200))), "86fafc37c667717c5dce87c9db7f6e37355da7393e4368ae16b19f4f0836fc56");
  assert.equal(sha(qrMatrix("z".repeat(666))), "442c8610a780807b3af18def1203963be6560243b8cee67b5191a0bbe10ab58f");
});

/** The standard's 15 format strings for level M, masks 0 to 7. */
const FORMAT_M = ["101010000010010", "101000100100101", "101111001111100", "101101101001011", "100010111111001", "100000011001110", "100111110010111", "100101010100000"];

/** A small decoder written from the standard: reads the format, unmasks, reads the codewords in order, checks every block's error correction, and returns the text. */
function decode(m: boolean[][]): string {
  const size = m.length;
  const version = (size - 17) / 4;
  const bit = (x: number, y: number): number => (m[y][x] ? 1 : 0);
  const first = [[8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8], [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]].map(([x, y]) => bit(x, y)).reverse().join("");
  const second = [...Array.from({ length: 7 }, (_, i) => [8, size - 1 - i]), ...Array.from({ length: 8 }, (_, i) => [size - 8 + i, 8])].map(([x, y]) => bit(x, y)).join("");
  const mask = FORMAT_M.indexOf(first);
  assert.ok(mask >= 0, "the first format copy is one of the standard's");
  assert.equal(second, first, "both copies of the format agree");
  const fn = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const mark = (x0: number, y0: number, w: number, h: number): void => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (x >= 0 && y >= 0 && x < size && y < size) fn[y][x] = true; };
  mark(0, 0, 9, 9); mark(size - 8, 0, 8, 9); mark(0, size - 8, 9, 8);
  mark(6, 0, 1, size); mark(0, 6, size, 1);
  const centres = version === 1 ? [] : (() => {
    const n = Math.floor(version / 7) + 2;
    const step = Math.ceil((version * 4 + 4) / (n * 2 - 2)) * 2;
    const out = [6];
    for (let at = size - 7; out.length < n; at -= step) out.splice(1, 0, at);
    return out;
  })();
  centres.forEach((cy, i) => centres.forEach((cx, j) => { if (!((i === 0 && j === 0) || (i === 0 && j === centres.length - 1) || (i === centres.length - 1 && j === 0))) mark(cx - 2, cy - 2, 5, 5); }));
  if (version >= 7) { mark(size - 11, 0, 3, 6); mark(0, size - 11, 6, 3); }
  const conditions = [(x: number, y: number) => (x + y) % 2 === 0, (_x: number, y: number) => y % 2 === 0, (x: number) => x % 3 === 0, (x: number, y: number) => (x + y) % 3 === 0, (x: number, y: number) => (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0, (x: number, y: number) => ((x * y) % 2) + ((x * y) % 3) === 0, (x: number, y: number) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0, (x: number, y: number) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0];
  const bits: number[] = [];
  let up = true;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let k = 0; k < size; k++) for (const x of [right, right - 1]) {
      const y = up ? size - 1 - k : k;
      if (!fn[y][x]) bits.push(bit(x, y) ^ (conditions[mask](x, y) ? 1 : 0));
    }
    up = !up;
  }
  const codewords: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) codewords.push(parseInt(bits.slice(i, i + 8).join(""), 2));
  const [ec, n1, d1, n2, d2] = BLOCKS[version - 1];
  const sizes = [...Array(n1).fill(d1), ...Array(n2).fill(d2)] as number[];
  const total = sizes.reduce((a, b) => a + b, 0);
  const blocks = sizes.map(() => ({ data: [] as number[], ec: [] as number[] }));
  let at = 0;
  for (let i = 0; i < Math.max(d1, d2); i++) blocks.forEach((b, k) => { if (i < sizes[k]) b.data.push(codewords[at++]); });
  for (let i = 0; i < ec; i++) blocks.forEach((b) => b.ec.push(codewords[at++]));
  assert.equal(at, total + ec * sizes.length);
  for (const b of blocks) assert.deepEqual(errorCorrection(b.data, ec), b.ec, "a block's error correction holds");
  const data = blocks.flatMap((b) => b.data);
  const stream = data.map((c) => c.toString(2).padStart(8, "0")).join("");
  assert.equal(stream.slice(0, 4), "0100", "byte mode");
  const countBits = version < 10 ? 8 : 16;
  const count = parseInt(stream.slice(4, 4 + countBits), 2);
  const bytes = Array.from({ length: count }, (_, i) => parseInt(stream.slice(4 + countBits + i * 8, 12 + countBits + i * 8), 2));
  return new TextDecoder().decode(Uint8Array.from(bytes));
}

test("a code decodes back to its text: format, mask, every block's error correction, byte mode", () => {
  for (const t of ["Hi", "https://johnmorrisdotca.github.io/kazoku-ui/print.html?lang=ja&page=a4", "日本語のテキスト", "a".repeat(100), "b".repeat(200), "https://example.com/".repeat(20), "z".repeat(MAX_BYTES), ""]) {
    assert.equal(decode(qrMatrix(t)), t, t.slice(0, 20));
  }
});

test("every mask makes a code that decodes to the same text", () => {
  for (let mask = 0; mask < 8; mask++) assert.equal(decode(qrMatrix("https://example.com/", { mask })), "https://example.com/", `mask ${mask}`);
});

test("QR size follows the text: version 1 holds 14 bytes, 15 needs version 2, and more than 666 is refused", () => {
  assert.equal(qrMatrix("x".repeat(14)).length, 21);
  assert.equal(qrMatrix("x".repeat(15)).length, 25);
  assert.equal(MAX_BYTES, 666);
  assert.equal(qrMatrix("x".repeat(666)).length, 97);
  assert.throws(() => qrMatrix("x".repeat(667)), RangeError);
});

test("the QR picture is one SVG in modules with a quiet zone, and the sheet's finder corners are dark", () => {
  const svg = qrSvg("Hi");
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 29 29"/);
  assert.match(svg, /<path d="M4 4h7v1h-7z/);
  assert.match(qrSvg("Hi", { quiet: 2, dark: "#123", light: "#fff" }), /viewBox="0 0 25 25".*fill="#fff".*fill="#123"/);
});

test("fitToPage scales a picture to the printable area, keeping its shape, and centres it", () => {
  const tall = fitToPage({ page: "a4", widthMm: 100, heightMm: 200, orientation: "portrait" });
  const area = printableSize("a4");
  assert.equal(tall.orientation, "portrait");
  assert.equal(tall.heightMm, area.heightMm);
  assert.ok(Math.abs(tall.widthMm / tall.heightMm - 0.5) < 1e-3);
  assert.ok(Math.abs(tall.scale - area.heightMm / 200) < 1e-12);
  assert.equal(tall.offsetYMm, 0);
  assert.ok(Math.abs(tall.offsetXMm - (area.widthMm - tall.widthMm) / 2) < 1e-3);
  const wide = fitToPage({ page: "a4", widthMm: 300, heightMm: 100, orientation: "portrait" });
  assert.equal(wide.widthMm, area.widthMm);
  assert.equal(wide.offsetXMm, 0);
  assert.ok(wide.offsetYMm > 0);
});

test("fitToPage picks the turn that makes the picture larger, and a turn given is kept", () => {
  assert.equal(fitToPage({ page: "a3", widthMm: 420, heightMm: 297 }).orientation, "landscape");
  assert.equal(fitToPage({ page: "a3", widthMm: 297, heightMm: 420 }).orientation, "portrait");
  assert.equal(fitToPage({ page: "tabloid", widthMm: 10, heightMm: 10 }).orientation, "portrait");
  const forced = fitToPage({ page: "a3", widthMm: 420, heightMm: 297, orientation: "portrait" });
  assert.equal(forced.orientation, "portrait");
  assert.ok(forced.scale < fitToPage({ page: "a3", widthMm: 420, heightMm: 297 }).scale);
  const bigMargin = fitToPage({ page: "a4", widthMm: 100, heightMm: 100, orientation: "portrait", marginMm: 30 });
  assert.equal(bigMargin.widthMm, 150);
  const landscape = printableSize("a3", "landscape");
  const got = fitToPage({ page: "a3", widthMm: 420, heightMm: 297 });
  assert.ok(got.widthMm <= landscape.widthMm + 1e-9 && got.heightMm <= landscape.heightMm + 1e-9);
});

test("fitToPage scales up a small picture and down a large one, and refuses one of no size", () => {
  assert.ok(fitToPage({ page: "a4", widthMm: 10, heightMm: 10 }).scale > 1);
  assert.ok(fitToPage({ page: "a4", widthMm: 1000, heightMm: 1000 }).scale < 1);
  assert.throws(() => fitToPage({ page: "a4", widthMm: 0, heightMm: 10 }), RangeError);
  assert.throws(() => fitToPage({ page: "a4", widthMm: 10, heightMm: 10, marginMm: 200 }), RangeError);
});
