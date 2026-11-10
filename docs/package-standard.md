# The must-have list for a package

Every package of the family has the same published parts. Chikyu Earth shipped 0.3.0 to 0.5.0 without a demo, an embed page, a documentation site or a usage guide, and nothing said no. This list says it, and `check-standard.mjs` says it in CI. The rule itself, with its reasons, is in spx-stats `docs/package-work.md`, "The must-have list": **a first release is refused without every item**.

## The check

`templates/check-standard.mjs` is copied unchanged into each repository as `scripts/check-standard.mjs`, like the family's other shared files, and a test in the repository holds it to one recorded hash and fails when anything is missing. It reads files and runs nothing:

```sh
node scripts/check-standard.mjs        # prints what is missing, exit 1; or "ok"
```

| Item | What it asks |
|---|---|
| `demo` | `demo/index.html`, made with the family's header and footer |
| `pages` | `.github/workflows/pages.yml` deploying it, with GitHub Pages switched on for the repository |
| `homepage` | `package.json`'s `homepage` is `https://johnmorrisdotca.github.io/<package>/`, the README links it, and it is the repository's homepage |
| `embed` | `demo/embed.html` (or `demo/embed/index.html`): a page made for an `<iframe>`, drawing what its address says |
| `embed-panel` | the demo's "Put it in your page" is kazoku-ui's `<kazoku-embed-panel>` (a demo page in `demo/` holds the tag), filled with the package's own choices and code |
| `page-frame` | every `demo/*.html` page, other than an embed or a test page, has the family's page header (`<kazoku-page-header>`: what the page is, a way home, the printable sheets) and credit line (`<kazoku-page-credits>`) and a `<title>`; an embed page has the credit line, in its `embed` form |
| `family-files` | `scripts/family-template.mjs` (listing the package, with the kazoku-ui language picker and theme switch in the header), `scripts/family-readme.mjs`, `demo/family.css` |
| `docs-site` | `scripts/docs-site.mjs`, `docs/site.json`, and the guides in `docs/guides/` |
| `ja-guides` | a Japanese twin in `docs/guides/ja/` for every guide, one language to a page |
| `usage-tested` | an `examples/` folder and a `test:usage` script that builds, runs or type-checks every example |
| `usage-in-ci` | `.github/workflows/ci.yml` runs `test:usage` |
| `script-tag`, `esm`, `bundlers`, `react`, `vue`, `svelte`, `angular`, `iframe`, `typescript` | the README or a guide shows it, as a copy-paste example that the test runs |

## When an item cannot apply

A data package has no element to put in a template; a game has no import to show. Say so in `package.json`, with the reason, and a reviewer reads it:

```json
{ "family": { "notApplicable": { "angular": "a data package: there is no element to put in a template" } } }
```

A reason shorter than a sentence is refused, and so is an item that is not on the list.

## Adopting it

1. Copy `templates/check-standard.mjs` to `scripts/check-standard.mjs`.
2. Add `"check:standard": "node scripts/check-standard.mjs"` and a test that runs `standardOf(".")` and compares the file's hash to the recorded one (chikyu-earth's `test/standard.test.ts` is the pattern).
3. Fill what it says is missing. [chikyu-earth](https://github.com/johnmorrisdotca/chikyu-earth) has every item and is the example to copy: its `examples/`, `scripts/check-usage.ts`, `docs/guides/`, `demo/embed.html`.

## The page frame

The `page-frame` item (STANDARD_VERSION 2026-11-10) exists because a visitor lands on any page of a demo, from a search, a shared link or a README, not only on its home. Every page must therefore say what it is, give a way home and to the printable sheets, credit its data, and have a real title and description, on a desk and on a phone, without opening a menu. [The guide](guides/page-frame.md) says how; this is the rule and how a package adopts it.

1. **Which pages.** Every `demo/*.html` page except the embed pages (`embed.html`, `embed-3d.html`, `embed-page.html`, `*-embed.html`) and test pages (`*-check.html`, `test.html`). An embed page, made for someone else's site, gets the credit line only, in its `embed` form.
2. **How.** Put `<kazoku-page-header name what sheets meta>` inside the page's top bar, as a row of it (not a second bar), and `<kazoku-page-credits credits href>` last on the page, above the family footer. A page a build makes from a source file puts the placeholders `<!--frame:head-->`, `<!--frame:header-->` and `<!--frame:credits-->` in the source (the family template's `<!--family:head-->` also counts for the head), and the build replaces them with `pageHeadHtml`, `pageHeaderHtml` and `pageCreditsHtml` from `@johnmorrisdotca/kazoku-ui/page-frame`, from one table of the page's words in English and Japanese. The page's script imports `@johnmorrisdotca/kazoku-ui/page-frame/define`.
3. **The check.** `check-standard.mjs` reads the sources and names each page that lacks a title, the header or the credit line. It cannot see the built HTML, so the package's own test also runs `pageProblems` over every page its build wrote (`site/*.html`, with `{ embed: true }` for the embed pages); the example is in the guide.
4. **What the credit line says.** This page's own data credits, or one "Data and credits" link to the NOTICE or credits page (or both). A package whose data has a licence that asks for credit shows the credit on the page, not only in `NOTICE.md`.
5. **When it cannot apply.** A package with no demo page of its own says so in `family.notApplicable` with a reason, like any item.

## The embed panel

The `embed-panel` item (STANDARD_VERSION 2026-11-03) asks for the one shared panel, not a copy of it: a picker, a size, a tab for HTML, ES module, React, Vue, Angular, Svelte and iframe (and the package's own, such as an image), a live picture that fits its box, Copy with its name on it, Open the embed page, Read the docs and the credit line. [The guide](guides/embed-panel.md) says how; [the survey](embed-panel-survey.md) says which package's panel does each part best and what each package's panel has today, so that nothing a package has is lost when it adopts the shared one. A package that draws nothing still adopts it: `no-preview no-size` and the tabs that make sense. A package that has no demo page to put it in says so in `family.notApplicable`.

The `data-door` item (STANDARD_VERSION 2026-11-10) is different from the rest: a package is not asked to have a data door, but a package that has `src/data-door.ts` must hold kazoku-ui's `templates/data-door.ts` unchanged, compared by its recorded SHA-256 (`DATA_DOOR_SHA256`, which a kazoku-ui test keeps equal to the template). [The guide](guides/data-door.md) says what the door is and how a package adopts it.

A change to the list is a change to this file in kazoku-ui, with a new `STANDARD_VERSION`, and then to every repository's copy and recorded hash.
