// How well a name matches what the reader typed, and where, so a page can put the best answers first and the element can mark the matched part.
// Nothing here touches the DOM, so it imports on a server. Matching ignores case, accents, full-width against half-width forms, and katakana against hiragana.

/** The tiers `rank` returns, best first. A larger number is a better match. */
export const RANK = { none: 0, contains: 1, wordStart: 2, prefix: 3, exact: 4 } as const;

/** One of the numbers in `RANK`. */
export type Rank = (typeof RANK)[keyof typeof RANK];

/** A piece of a text: `match` is true for the part the query found. */
export interface Segment {
  text: string;
  match: boolean;
}

interface Folded {
  /** The folded text. */
  text: string;
  /** For each UTF-16 unit of `text`, the index in the original text of the character it came from. */
  from: number[];
}

/** A hiragana or katakana letter, as hiragana: the two scripts are one to a reader who types either. */
const kana = (char: string): string => char.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

/** One character, folded: compatibility forms (full-width letters, half-width katakana) to their plain ones, accents off, lower case, katakana to hiragana. */
function foldChar(char: string): string {
  return kana(char.normalize("NFKC").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase());
}

function fold(text: string): Folded {
  let out = "";
  const from: number[] = [];
  let index = 0;
  for (const char of text) {
    const folded = foldChar(char);
    for (let i = 0; i < folded.length; i += 1) from.push(index);
    out += folded;
    index += char.length;
  }
  return { text: out, from };
}

/** The text a query is matched as: folded, with runs of spaces made one and the ends trimmed. */
function needleOf(query: string): string {
  return fold(query).text.replace(/\s+/g, " ").trim();
}

/** Where a word could start: the start of the text, or after anything that is not a letter or a digit. */
const startsWord = (text: string, at: number): boolean => at === 0 || !/[\p{L}\p{N}]/u.test(text[at - 1] ?? "");

function rankOne(needle: string, candidate: string): Rank {
  const hay = fold(candidate).text.replace(/\s+/g, " ").trim();
  if (hay === needle) return RANK.exact;
  if (hay.startsWith(needle)) return RANK.prefix;
  let best: Rank = RANK.none;
  for (let at = hay.indexOf(needle); at >= 0; at = hay.indexOf(needle, at + 1)) {
    if (startsWord(hay, at)) return RANK.wordStart;
    best = RANK.contains;
  }
  return best;
}

/**
 * How well `query` matches a name or any of its aliases: `RANK.exact` (4) for the whole name, then `RANK.prefix` (3), `RANK.wordStart` (2) for the start of a later word,
 * `RANK.contains` (1), and `RANK.none` (0) for no match. The best of the name and the aliases counts. An empty query matches nothing.
 *
 * @example
 * rank("mar", "Mars"); // 3, a prefix
 * rank("ars", "Mars"); // 1, inside the name
 * rank("ｍａｒｓ", "Mars"); // 4, full-width letters fold to plain ones
 * rank("かたかな", "カタカナ"); // 4, katakana and hiragana fold together
 * rank("red planet", "Mars", ["Red Planet"]); // 4, an alias
 */
export function rank(query: string, name: string, aliases: readonly string[] = []): Rank {
  const needle = needleOf(query);
  if (needle === "") return RANK.none;
  let best: Rank = RANK.none;
  for (const candidate of [name, ...aliases]) {
    const one = rankOne(needle, candidate);
    if (one > best) best = one;
    if (best === RANK.exact) break;
  }
  return best;
}

/**
 * `text` cut into pieces, the part `query` matched marked. The whole query is looked for first; when it is not there, each word of it is. Case, accents, width and kana
 * folding are as in `rank`, and the pieces always join back into `text` exactly. A query that matches nothing gives one unmarked piece.
 *
 * @example
 * highlight("Mars Orbiter", "orb"); // [{ text: "Mars ", match: false }, { text: "Orb", match: true }, { text: "iter", match: false }]
 */
export function highlight(text: string, query: string): Segment[] {
  const needle = needleOf(query);
  if (text === "") return [];
  const folded = fold(text);
  const spans: Array<[number, number]> = [];
  const find = (word: string): void => {
    if (word === "") return;
    for (let at = folded.text.indexOf(word); at >= 0; at = folded.text.indexOf(word, at + word.length)) {
      spans.push([at, at + word.length]);
    }
  };
  find(needle);
  if (spans.length === 0) for (const word of needle.split(" ")) find(word);
  if (spans.length === 0) return [{ text, match: false }];
  // back to the original text: a span starts at its first character and ends after its last one, which may be a surrogate pair
  const ranges = spans
    .map(([a, b]): [number, number] => {
      const start = folded.from[a] ?? 0;
      const last = folded.from[b - 1] ?? start;
      const char = String.fromCodePoint(text.codePointAt(last) ?? 0);
      return [start, last + char.length];
    })
    .sort((x, y) => x[0] - y[0]);
  const merged: Array<[number, number]> = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last !== undefined && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
    else merged.push([range[0], range[1]]);
  }
  const out: Segment[] = [];
  let at = 0;
  for (const [a, b] of merged) {
    if (a > at) out.push({ text: text.slice(at, a), match: false });
    out.push({ text: text.slice(a, b), match: true });
    at = b;
  }
  if (at < text.length) out.push({ text: text.slice(at), match: false });
  return out;
}
