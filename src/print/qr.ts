// A QR Code encoder (ISO/IEC 18004) written for this package: byte mode, error-correction level M, versions 1 to 20 (up to 666 bytes), the mask chosen by the standard's four penalty rules.
// Pure: no DOM. `qrMatrix` gives the modules; `qrSvg` gives a picture of them for a printed sheet.

/** Per version (1 to 20) at level M, exported for the tests: [error-correction codewords per block, blocks of the first size, data codewords in each, blocks of the second size, data codewords in each]. */
export const BLOCKS: readonly (readonly [number, number, number, number, number])[] = [
  [10, 1, 16, 0, 0], [16, 1, 28, 0, 0], [26, 1, 44, 0, 0], [18, 2, 32, 0, 0], [24, 2, 43, 0, 0], [16, 4, 27, 0, 0], [18, 4, 31, 0, 0], [22, 2, 38, 2, 39], [22, 3, 36, 2, 37], [26, 4, 43, 1, 44],
  [30, 1, 50, 4, 51], [22, 6, 36, 2, 37], [22, 8, 37, 1, 38], [24, 4, 40, 5, 41], [24, 5, 41, 5, 42], [28, 7, 45, 3, 46], [28, 10, 46, 1, 47], [26, 9, 43, 4, 44], [26, 3, 44, 11, 45], [26, 3, 41, 13, 42],
];
export const MAX_VERSION = BLOCKS.length;

const dataCodewords = (version: number): number => {
  const [, n1, d1, n2, d2] = BLOCKS[version - 1];
  return n1 * d1 + n2 * d2;
};
/** How many bytes of text a version holds at level M (the mode and count take 12 bits up to version 9, 20 bits after). */
const capacity = (version: number): number => Math.floor((dataCodewords(version) * 8 - (version < 10 ? 12 : 20)) / 8);
/** The most bytes of text one code holds at level M. */
export const MAX_BYTES = capacity(MAX_VERSION);

// Arithmetic in GF(256), polynomial 0x11D.
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
for (let i = 0, x = 1; i < 255; i++) {
  EXP[i] = x;
  LOG[x] = i;
  x <<= 1;
  if (x & 0x100) x ^= 0x11d;
}
for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
const mul = (a: number, b: number): number => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);

/** The Reed-Solomon error-correction codewords for some data codewords: the remainder of the data divided by the generator of the given degree. */
export function errorCorrection(data: readonly number[], degree: number): number[] {
  const divisor = new Array<number>(degree).fill(0);
  divisor[degree - 1] = 1;
  for (let i = 0, root = 1; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      divisor[j] = mul(divisor[j], root);
      if (j + 1 < degree) divisor[j] ^= divisor[j + 1];
    }
    root = mul(root, 2);
  }
  const rest = new Array<number>(degree).fill(0);
  for (const byte of data) {
    const factor = byte ^ (rest.shift() as number);
    rest.push(0);
    for (let i = 0; i < degree; i++) rest[i] ^= mul(divisor[i], factor);
  }
  return rest;
}

const utf8 = (text: string): number[] => [...new TextEncoder().encode(text)];

/** The smallest version that holds this many bytes. */
export function versionFor(bytes: number): number {
  for (let version = 1; version <= MAX_VERSION; version++) if (bytes <= capacity(version)) return version;
  throw new RangeError(`A QR code here holds at most ${MAX_BYTES} bytes; this text is ${bytes}`);
}

/** The data bits, padded to fill the version, split into blocks, each with its error correction, and interleaved. */
function codewords(bytes: readonly number[], version: number): number[] {
  const bits: number[] = [];
  const push = (value: number, count: number): void => { for (let i = count - 1; i >= 0; i--) bits.push((value >>> i) & 1); };
  push(0b0100, 4);
  push(bytes.length, version < 10 ? 8 : 16);
  for (const byte of bytes) push(byte, 8);
  const room = dataCodewords(version) * 8;
  push(0, Math.min(4, room - bits.length));
  push(0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < room; pad ^= 0xec ^ 0x11) push(pad, 8);
  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(""), 2));
  const [ec, n1, d1, n2] = BLOCKS[version - 1];
  const blocks: { data: number[]; ec: number[] }[] = [];
  for (let i = 0, at = 0; i < n1 + n2; i++) {
    const size = i < n1 ? d1 : BLOCKS[version - 1][4];
    const part = data.slice(at, at + size);
    at += size;
    blocks.push({ data: part, ec: errorCorrection(part, ec) });
  }
  const out: number[] = [];
  const longest = Math.max(d1, BLOCKS[version - 1][4]);
  for (let i = 0; i < longest; i++) for (const block of blocks) if (i < block.data.length) out.push(block.data[i]);
  for (let i = 0; i < ec; i++) for (const block of blocks) out.push(block.ec[i]);
  return out;
}

/** The centres of the alignment patterns along one side. */
function alignmentCentres(version: number): number[] {
  if (version === 1) return [];
  const count = Math.floor(version / 7) + 2;
  const size = version * 4 + 17;
  const step = Math.ceil((version * 4 + 4) / (count * 2 - 2)) * 2;
  const out = [6];
  for (let at = size - 7; out.length < count; at -= step) out.splice(1, 0, at);
  return out;
}

const MASKS: readonly ((x: number, y: number) => boolean)[] = [
  (x, y) => (x + y) % 2 === 0,
  (_x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

/** The 15 format bits for level M and a mask (BCH-protected, then XORed with 101010000010010). */
const formatBits = (mask: number): number => {
  const data = mask; // level M is 00
  let rest = data;
  for (let i = 0; i < 10; i++) rest = (rest << 1) ^ ((rest >>> 9) * 0x537);
  return ((data << 10) | rest) ^ 0x5412;
};

/** The 18 version bits (versions 7 and up). */
const versionBits = (version: number): number => {
  let rest = version;
  for (let i = 0; i < 12; i++) rest = (rest << 1) ^ ((rest >>> 11) * 0x1f25);
  return (version << 12) | rest;
};

/** The standard's penalty for a finished matrix: runs, 2x2 blocks, finder-like patterns and the balance of dark and light. */
function penalty(m: readonly (readonly boolean[])[]): number {
  const size = m.length;
  let score = 0;
  const lines: string[] = [];
  for (let i = 0; i < size; i++) {
    lines.push(m[i].map((v) => (v ? "1" : "0")).join(""));
    lines.push(m.map((row) => (row[i] ? "1" : "0")).join(""));
  }
  for (const line of lines) {
    for (const run of line.match(/0+|1+/g) as string[]) if (run.length >= 5) score += 3 + run.length - 5;
    for (const find of ["10111010000", "00001011101"]) for (let at = line.indexOf(find); at !== -1; at = line.indexOf(find, at + 1)) score += 40;
  }
  for (let y = 0; y < size - 1; y++) for (let x = 0; x < size - 1; x++) if (m[y][x] === m[y][x + 1] && m[y][x] === m[y + 1][x] && m[y][x] === m[y + 1][x + 1]) score += 3;
  let dark = 0;
  for (const row of m) for (const v of row) if (v) dark++;
  score += (Math.ceil(Math.abs(dark * 20 - size * size * 10) / (size * size)) - 1) * 10;
  return score;
}

export interface QrOptions {
  /** Use this mask (0 to 7) instead of the best one; for tests. */
  mask?: number;
}

/** The modules of a QR code for some text (UTF-8, level M, the smallest version that holds it): `true` is dark. Throws a RangeError for more than `MAX_BYTES` bytes. */
export function qrMatrix(text: string, options: QrOptions = {}): boolean[][] {
  const bytes = utf8(text);
  const version = versionFor(bytes.length);
  const size = version * 4 + 17;
  const stream = codewords(bytes, version);
  const base: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const fixed: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const set = (x: number, y: number, dark: boolean): void => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    base[y][x] = dark;
    fixed[y][x] = true;
  };
  for (let i = 0; i < size; i++) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }
  for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]]) {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const ring = Math.max(Math.abs(dx), Math.abs(dy));
      set(cx + dx, cy + dy, ring !== 2 && ring !== 4);
    }
  }
  const centres = alignmentCentres(version);
  centres.forEach((cy, i) => centres.forEach((cx, j) => {
    if ((i === 0 && j === 0) || (i === 0 && j === centres.length - 1) || (i === centres.length - 1 && j === 0)) return;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }));
  const drawFormat = (mask: number): void => {
    const bits = formatBits(mask);
    const bit = (i: number): boolean => ((bits >>> i) & 1) !== 0;
    for (let i = 0; i <= 5; i++) set(8, i, bit(i));
    set(8, 7, bit(6));
    set(8, 8, bit(7));
    set(7, 8, bit(8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i));
    set(8, size - 8, true);
  };
  drawFormat(0);
  if (version >= 7) {
    const bits = versionBits(version);
    for (let i = 0; i < 18; i++) {
      const dark = ((bits >>> i) & 1) !== 0;
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      set(a, b, dark);
      set(b, a, dark);
    }
  }
  // The data, up the right-hand pair of columns first, then down the next pair, skipping the timing column.
  const data: boolean[][] = base.map((row) => row.slice());
  let at = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let step = 0; step < size; step++) for (let j = 0; j < 2; j++) {
      const x = right - j;
      const y = ((right + 1) & 2) === 0 ? size - 1 - step : step;
      if (!fixed[y][x] && at < stream.length * 8) {
        data[y][x] = ((stream[at >>> 3] >>> (7 - (at & 7))) & 1) !== 0;
        at++;
      }
    }
  }
  const masked = (mask: number): boolean[][] => data.map((row, y) => row.map((v, x) => (fixed[y][x] ? v : v !== MASKS[mask](x, y))));
  let best = options.mask ?? 0;
  if (options.mask === undefined) {
    let lowest = Infinity;
    for (let mask = 0; mask < 8; mask++) {
      const score = penalty(withFormat(masked(mask), mask, size));
      if (score < lowest) { lowest = score; best = mask; }
    }
  }
  return withFormat(masked(best), best, size);
}

/** A matrix with the format bits for a mask written into it. */
function withFormat(m: boolean[][], mask: number, size: number): boolean[][] {
  const bits = formatBits(mask);
  const bit = (i: number): boolean => ((bits >>> i) & 1) !== 0;
  const put = (x: number, y: number, dark: boolean): void => { m[y][x] = dark; };
  for (let i = 0; i <= 5; i++) put(8, i, bit(i));
  put(8, 7, bit(6));
  put(8, 8, bit(7));
  put(7, 8, bit(8));
  for (let i = 9; i < 15; i++) put(14 - i, 8, bit(i));
  for (let i = 0; i < 8; i++) put(size - 1 - i, 8, bit(i));
  for (let i = 8; i < 15; i++) put(8, size - 15 + i, bit(i));
  put(8, size - 8, true);
  return m;
}

export interface QrSvgOptions {
  /** Light modules around the code, in modules (the standard asks for 4). */
  quiet?: number;
  dark?: string;
  light?: string;
}

/** A QR code as an SVG string: one path for every dark module, a light square behind it, `viewBox` in modules so any CSS size works. */
export function qrSvg(text: string, options: QrSvgOptions = {}): string {
  const { quiet = 4, dark = "#000", light = "#fff" } = options;
  const m = qrMatrix(text);
  const size = m.length + quiet * 2;
  let d = "";
  m.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (!row[x]) continue;
      let end = x;
      while (end + 1 < row.length && row[end + 1]) end++;
      d += `M${x + quiet} ${y + quiet}h${end - x + 1}v1h-${end - x + 1}z`;
      x = end;
    }
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" role="img" aria-label="QR code"><rect width="${size}" height="${size}" fill="${light}"/><path d="${d}" fill="${dark}"/></svg>`;
}
