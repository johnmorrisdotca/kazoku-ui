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
const frontMatter = (text) => {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!match) return null;
  return Object.fromEntries(match[1].split('\n').map((line) => [line.slice(0, line.indexOf(':')).trim(), line.slice(line.indexOf(':') + 1).trim()]));
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
    const text = read(`docs/guides/${file}`), meta = frontMatter(text);
    pages.push({ path: `docs/guides/${file}`, text });
    if (!meta?.title || !meta.description || !SECTIONS.includes(meta.section)) bad(`docs/guides/${file}: the front matter needs title, description and a section of ${SECTIONS.join(', ')}`);
    if (!japanese.includes(file)) { bad(`docs/guides/${file} has no Japanese twin docs/guides/ja/${file}`); continue; }
    const twin = read(`docs/guides/ja/${file}`);
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
