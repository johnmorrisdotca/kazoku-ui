// The documentation's two jobs, in `pnpm docs:api` and `pnpm docs:check` (the same file in every package of the family that has no generated site):
//
//   node scripts/docs.mjs api     write docs/API.md: every export of every entry point in package.json's `exports`, read from the built
//                                 declarations (dist/*.d.ts) with the TypeScript compiler: its kind, its declaration, and the summary of its doc comment.
//   node scripts/docs.mjs check   write nothing and fail on anything that makes the documentation wrong or incomplete (after `pnpm build`):
//                                   - docs/API.md is not what `api` would write now (the code changed and the reference did not);
//                                   - a guide in docs/guides/ has no front matter (title, section, description), or no Japanese twin in docs/guides/ja/ with the same
//                                     file name, the same number of code blocks in the same languages, and Japanese text; or a Japanese page has none of its English one;
//                                   - a link in the README or a guide to a file or an image that is not there, or an `#anchor` that no heading makes;
//                                   - a function, class or constant the package exports that no guide and not the README names;
//                                   - a release in CHANGELOG.md with no date, or a README over 64,000 characters (npm cuts at 65,536).
//
// A guide's front matter:  ---\n title: ...\n section: tutorial|how-to|explanation|troubleshooting|upgrading\n order: 1\n description: one sentence\n ---
// It is read as YAML is, strictly (KAZOKU-UI-102; GitHub shows "Error in user YAML" above a guide that is not): one `key: value` to a line from the left edge, a value in
// "double quotes" when it holds a colon and a space or " #", or starts with one of `[ ] { } & * ! | > % @` or a backtick, no tab, no indented continuation, no key twice.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8').replace(/\r\n/g, '\n');
const pkg = JSON.parse(read('package.json'));
const SECTIONS = ['tutorial', 'how-to', 'explanation', 'troubleshooting', 'upgrading'];
const KIND = { [ts.SyntaxKind.FunctionDeclaration]: 'function', [ts.SyntaxKind.ClassDeclaration]: 'class', [ts.SyntaxKind.InterfaceDeclaration]: 'interface', [ts.SyntaxKind.TypeAliasDeclaration]: 'type', [ts.SyntaxKind.VariableDeclaration]: 'constant', [ts.SyntaxKind.EnumDeclaration]: 'enum' };

/** The entry points that are code: [{ key, importPath, types }]. */
function entries() {
  return Object.entries(pkg.exports ?? {})
    .filter(([key, value]) => !key.includes('*') && typeof value === 'object' && typeof value.types === 'string')
    .map(([key, value]) => ({ key, importPath: key === '.' ? pkg.name : `${pkg.name}/${key.slice(2)}`, types: resolve(root, value.types) }));
}

/** Every export of every entry point, with the entry points that export it. */
export function exportsOf() {
  const list = entries();
  const program = ts.createProgram(list.map((entry) => entry.types), { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, skipLibCheck: true, noEmit: true, lib: ['lib.es2023.d.ts', 'lib.dom.d.ts'] });
  const checker = program.getTypeChecker();
  return list.map((entry) => {
    const source = program.getSourceFile(entry.types);
    const module = source && checker.getSymbolAtLocation(source);
    const symbols = module ? checker.getExportsOfModule(module) : [];
    const items = symbols.map((symbol) => {
      const real = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
      const declaration = real.declarations?.[0];
      const kind = declaration ? KIND[declaration.kind] ?? 'value' : 'value';
      // Japanese words in a doc comment are shown as code, so the English reference stays one language.
      const summary = ts.displayPartsToString(real.getDocumentationComment(checker)).trim().replace(/[\u3000-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uff00-\uffef]+/g, (run) => `\`${run}\``);
      let text = declaration ? declaration.getText() : '';
      if (declaration && kind === 'constant') text = `${declaration.parent.parent.getText().replace(/;$/, '')};`.replace(/^export /, '');
      text = text.replace(/^export\s+(declare\s+)?/, '').replace(/^declare\s+/, '');
      return { name: symbol.getName(), kind, summary, text: text.trim() };
    }).sort((a, b) => a.name.localeCompare(b.name));
    return { ...entry, items };
  });
}

/** docs/API.md, as the code says it now. */
export function apiText() {
  const out = [`# ${pkg.name} API reference`, '', `Every export of ${pkg.name} ${pkg.version}, one section for each entry point, written by \`pnpm docs:api\` from the built declarations. Do not edit it by hand: \`pnpm docs:check\` fails when it is out of date. The guides are in [docs/guides](guides/getting-started.md).`, ''];
  for (const entry of exportsOf()) {
    out.push(`## \`${entry.importPath}\``, '');
    const values = entry.items.filter((item) => !['type', 'interface'].includes(item.kind));
    const types = entry.items.filter((item) => ['type', 'interface'].includes(item.kind));
    out.push(`${values.length} value${values.length === 1 ? '' : 's'} and ${types.length} type${types.length === 1 ? '' : 's'}.`, '', '```js', `import { ${values.map((item) => item.name).join(', ') || '/* types only */'} } from '${entry.importPath}';`, '```', '');
    for (const item of [...values, ...types]) {
      out.push(`### ${item.name}`, '', `*${item.kind}*${item.summary ? `. ${item.summary.split('\n')[0]}` : ''}`, '', '```ts', item.text, '```', '');
    }
  }
  return `${out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`;
}

const slug = (text) => text.toLowerCase().trim().replace(/<[^>]*>/g, '').replace(/[`*_]/g, '').replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s+/g, '-');
const fences = (text) => [...text.matchAll(/^```(\S*)[^\n]*\n[\s\S]*?\n```$/gm)].map((match) => match[1]);
const headings = (text) => new Set([...text.replace(/^```[\s\S]*?^```/gm, '').matchAll(/^#{1,6} (.+)$/gm)].map((match) => slug(match[1])));
const YAML_ESCAPES = { "0": "\0", a: "\x07", b: "\b", t: "\t", "\t": "\t", n: "\n", v: "\v", f: "\f", r: "\r", e: "\x1b", " ": " ", '"': '"', "/": "/", "\\": "\\", N: "\x85", _: "\xa0", L: " ", P: " " };
/** What YAML would make of one front matter value: its text, or a plain sentence saying what is wrong with it. */
const yamlValue = (key, raw) => {
  const value = raw.replace(/\s+$/, "");
  if (value === "") return { text: "" };
  const first = value[0];
  if (first === '"') {
    const match = /^"((?:[^"\\]|\\.)*)"(?:\s+#.*)?$/.exec(value);
    if (!match) return { problem: `${key} starts with a double quote and does not end with one (or has text after the closing quote): close the quote, and write \\" for a quote inside it.` };
    const bad = /\\(?![0abt\tnvfre "/\\N_LPxuU])/.exec(match[1]);
    if (bad) return { problem: `${key} has \\${match[1][bad.index + 1] ?? ""} in double quotes, which YAML does not know: write \\\\ for one backslash.` };
    return { text: match[1].replace(/\\(x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4}|U[0-9a-fA-F]{8}|.)/gs, (_, code) => (code.length > 1 ? String.fromCodePoint(parseInt(code.slice(1), 16)) : YAML_ESCAPES[code] ?? code)) };
  }
  if (first === "'") {
    const match = /^'((?:[^']|'')*)'(?:\s+#.*)?$/.exec(value);
    if (!match) return { problem: `${key} starts with a single quote and does not end with one (or has text after the closing quote): close the quote, and write '' for a quote inside it.` };
    return { text: match[1].replace(/''/g, "'") };
  }
  if (/^[[\]{}&*!|>%@`]/.test(first) || /^[-?:](\s|$)/.test(value)) return { problem: `${key} starts with ${first}, which YAML reads as syntax, not text: put the whole value in "double quotes".` };
  if (/\t/.test(value)) return { problem: `${key} has a tab in it: use a space, or put the value in "double quotes".` };
  if (/:(\s|$)/.test(value)) return { problem: `${key} has a colon followed by a space (or ends in a colon) and is not in quotes, so YAML reads it as another key (GitHub shows "Error in user YAML"): put the whole value in "double quotes".` };
  if (/\s#/.test(value)) return { problem: `${key} has " #" in it and is not in quotes, so YAML reads the rest as a comment and drops it: put the whole value in "double quotes".` };
  return { text: value };
};

/**
 * A guide's front matter read the way YAML reads it, and strictly: one `key: value` to a line, a value in quotes when it holds a colon and a space, " #" or
 * starts with a character YAML uses as syntax, no tab, no indented continuation line, no key twice. Returns { data, body, problems }, where `data` is null with
 * no front matter and each problem is { line, text } (the line of the file, 1 for its first).
 */
export const parseFrontMatter = (text) => {
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  if (!match) return { data: null, body: text, problems: [] };
  const data = {};
  const problems = [];
  match[1].split("\n").forEach((rawLine, index) => {
    const line = index + 2;
    const text = rawLine.replace(/\r$/, "");
    if (text.trim() === "" || text[0] === "#") return;
    if (/^ *\t/.test(text)) return void problems.push({ line, text: "is indented with a tab, which YAML does not allow: front matter is one `key: value` to a line, from the left edge." });
    if (text[0] === " ") return void problems.push({ line, text: "is indented, so YAML reads it as part of the line above or as a mistake: front matter is one `key: value` to a line, from the left edge; keep the whole value on the key's line, in \"double quotes\"." });
    const pair = /^([A-Za-z][\w-]*):( +|$)(.*)$/.exec(text);
    if (!pair) return void problems.push({ line, text: "is not `key: value` (a key, a colon, a space, the value): YAML does not read it as a pair." });
    const [, key, , raw] = pair;
    if (Object.hasOwn(data, key)) return void problems.push({ line, text: `has the key ${key} a second time.` });
    const read = yamlValue(key, raw);
    if (read.problem !== undefined) { problems.push({ line, text: read.problem }); data[key] = raw.trim(); return; }
    data[key] = read.text;
  });
  return { data, body: text.slice(match[0].length), problems };
};

function check() {
  const problems = [];
  const bad = (message) => problems.push(message);
  const api = existsSync(join(root, 'docs/API.md')) ? read('docs/API.md') : '';
  if (api !== apiText()) bad('docs/API.md is not what `pnpm docs:api` writes now: run it and commit the file');
  const readme = read('README.md');
  if (readme.length > 64000) bad(`README.md is ${readme.length} characters; npm cuts at 65,536. Move detail into a guide, do not cut it`);
  const guideDir = join(root, 'docs/guides');
  const english = readdirSync(guideDir).filter((file) => file.endsWith('.md')).sort();
  const japanese = existsSync(join(guideDir, 'ja')) ? readdirSync(join(guideDir, 'ja')).filter((file) => file.endsWith('.md')).sort() : [];
  const pages = [{ path: 'README.md', text: readme }];
  for (const file of english) {
    const text = read(`docs/guides/${file}`), { data: meta, problems: yaml } = parseFrontMatter(text);
    pages.push({ path: `docs/guides/${file}`, text });
    for (const problem of yaml) bad(`docs/guides/${file}:${problem.line} front matter ${problem.text}`);
    if (!meta?.title || !meta.description || !SECTIONS.includes(meta.section)) bad(`docs/guides/${file}: the front matter needs title, description and a section of ${SECTIONS.join(', ')}`);
    if (!japanese.includes(file)) { bad(`docs/guides/${file} has no Japanese twin docs/guides/ja/${file}`); continue; }
    const twin = read(`docs/guides/ja/${file}`);
    for (const problem of parseFrontMatter(twin).problems) bad(`docs/guides/ja/${file}:${problem.line} front matter ${problem.text}`);
    if (fences(text).join() !== fences(twin).join()) bad(`docs/guides/ja/${file}: its code blocks are not the same, in number and language, as the English page's`);
    if (!/[぀-ヿ一-鿿]/.test(twin.replace(/^```[\s\S]*?^```/gm, ''))) bad(`docs/guides/ja/${file} has no Japanese text`);
    if (/[a-z]{4,} [a-z]{4,} [a-z]{4,} [a-z]{4,}/.test(twin.replace(/^```[\s\S]*?^```/gm, '').replace(/`[^`]*`/g, '').replace(/\[[^\]]*\]\([^)]*\)/g, ''))) bad(`docs/guides/ja/${file} has a run of English words; the page is one language`);
    pages.push({ path: `docs/guides/ja/${file}`, text: twin });
  }
  for (const file of japanese) if (!english.includes(file)) bad(`docs/guides/ja/${file} has no English page`);
  // Links and images.
  for (const page of pages) {
    const body = page.text.replace(/^```[\s\S]*?^```/gm, '').replace(/`[^`\n]*`/g, '');
    const targets = [...body.matchAll(/!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)].map((match) => match[1]);
    targets.push(...[...body.matchAll(/(?:src|srcset|href)="([^"]+)"/g)].map((match) => match[1]));
    for (const target of targets) {
      if (/^(https?:|mailto:|data:)/.test(target)) continue;
      const [file, anchor] = target.split('#');
      const path = file ? resolve(root, dirname(page.path), file) : join(root, page.path);
      if (!existsSync(path)) { bad(`${page.path}: ${target} is not there`); continue; }
      if (anchor && path.endsWith('.md') && !headings(readFileSync(path, 'utf8')).has(decodeURIComponent(anchor))) bad(`${page.path}: ${target} names a heading that is not there`);
    }
  }
  // Every exported value is named somewhere a reader looks.
  const prose = pages.filter((page) => !page.path.includes('/ja/')).map((page) => page.text).join('\n');
  for (const entry of exportsOf()) for (const item of entry.items) {
    if (['type', 'interface'].includes(item.kind)) continue;
    if (!new RegExp(`\\b${item.name}\\b`).test(prose)) bad(`${entry.importPath} exports ${item.name}, which the README and the guides never name`);
  }
  // The changelog.
  const changelog = read('CHANGELOG.md');
  for (const match of changelog.matchAll(/^## (\[?\d+\.\d+\.\d+.*)$/gm)) if (!/^\[?\d+\.\d+\.\d+\]? [-—] \d{4}-\d\d-\d\d\b/.test(match[1])) bad(`CHANGELOG.md: "## ${match[1]}" has no date`);
  return problems;
}

const command = process.argv[2];
if (command === 'api') { writeFileSync(join(root, 'docs/API.md'), apiText()); console.log('docs/API.md written'); }
else if (command === 'check') {
  const problems = check();
  if (problems.length) { console.error(problems.map((problem) => `FAIL ${problem}`).join('\n')); console.error(`${problems.length} problem${problems.length === 1 ? '' : 's'} in the documentation`); process.exit(1); }
  console.log('the documentation holds: the reference is current, every guide has its Japanese twin, every link and picture is there, every export is named');
} else if (command) { console.error('usage: node scripts/docs.mjs api|check'); process.exit(2); }
