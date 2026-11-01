# Contributing

Thank you for helping. Ideas and fixes are welcome; write to john@johnmorris.ca or open a pull request.

## The rules

- **No runtime dependencies.** A part is plain TypeScript; a dependency is not added for convenience.
- **One part, one subpath.** Each part of the family's interface lives in `src/<part>/` and is exported as `@johnmorrisdotca/kazoku-ui/<part>`, with the pure code (no DOM at import) apart from the element, and the element apart from the file that registers its tag.
- **A part never draws the page's scene.** It reports what the reader chose; the page applies it.
- **Registering a tag leaves a taken tag alone.** `define` files call `customElements.get` first.
- **Controls are on or right beside the view and visible without scrolling; changing a control never stops or resets the turn; a compact bar on phones; reduced motion respected (no automatic start); light and dark; 48 px touch targets; no browser-default controls.**
- **Labels in English and Japanese**, every key in both (a test holds that); Japanese is read by someone who reads Japanese before it ships.
- **Docs pages are single-language.** The README and `docs/` are English; the page about the translations (`docs/labels.md`) may show both languages side by side.
- **No marks.** No brand, league, federation or sponsor mark, and never John's SPX, SPXN or SPXIS marks.
- **Test what you change.** Unit tests in `test/` (the maths, the address, the controller with a clock the test turns by hand), and the demo in a real browser in `e2e/`.
- **Needs Node 22 or later**; the tests run the TypeScript source with `node --test`, which needs 22.18 or later.
- **Ports.** This package owns local ports 8100 to 8199 and nothing outside them: the demo on 8100, the tests' on 8101, the picture script's on 8102. Check with `lsof -iTCP:<port> -sTCP:LISTEN` first, and stop a server by its process id, never by name.

## Pull requests

One change per pull request. Say what changed and how you checked it, and add a line to `CHANGELOG.md` under **Unreleased** for a change a user would notice.

## Commands

```sh
pnpm check          # lint, types, tests, the build and the packed package
pnpm test:package   # pack it as npm does, install it in an empty project, import every entry
pnpm test:demo      # build the demo and play it in Chromium and WebKit at a phone's width and a desk's
pnpm screenshots    # the README's hero picture, into docs/images
pnpm dev            # the demo on http://127.0.0.1:8100/
```
