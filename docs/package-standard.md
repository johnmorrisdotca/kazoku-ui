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

## The embed panel

The `embed-panel` item (STANDARD_VERSION 2026-11-03) asks for the one shared panel, not a copy of it: a picker, a size, a tab for HTML, ES module, React, Vue, Angular, Svelte and iframe (and the package's own, such as an image), a live picture that fits its box, Copy with its name on it, Open the embed page, Read the docs and the credit line. [The guide](guides/embed-panel.md) says how; [the survey](embed-panel-survey.md) says which package's panel does each part best and what each package's panel has today, so that nothing a package has is lost when it adopts the shared one. A package that draws nothing still adopts it: `no-preview no-size` and the tabs that make sense. A package that has no demo page to put it in says so in `family.notApplicable`.

A change to the list is a change to this file in kazoku-ui, with a new `STANDARD_VERSION`, and then to every repository's copy and recorded hash.
