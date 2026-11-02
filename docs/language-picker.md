# Language picker

`<kazoku-language-picker>`: a button for each language the page gives, each in its own name (English, 日本語, Français). It writes the choice as `lang` on a target
(the page's `<html>` unless you name another), keeps it in the address and, if asked, in `localStorage`, and tells the page with an event. It translates nothing: your page
reads the event and says its words.

```html
<kazoku-language-picker languages="en ja" address storage></kazoku-language-picker>
<script type="module">
  import "@johnmorrisdotca/kazoku-ui/language-picker/define";

  document.addEventListener("kazoku-languagechange", ({ detail }) => say(detail.lang));
</script>
```

## Attributes

| Attribute | |
|---|---|
| `languages` | The codes, separated by spaces or commas: `en ja fr`. Valid ones, once each, in the order given. `en ja` by default. A code is lower case with dashes (`pt-br`); `ja_JP` and `EN` are read as `ja-jp` and `en`. |
| `value` | The language to start in. Setting it later applies it. |
| `target` | A CSS selector for the element that gets `lang`. The page's `<html>` by default. Found in the picker's own tree first, so it works inside a shadow root. Or set `element.target = someElement`. |
| `address` | Keep the choice in the address (`?lang=ja`). `address-key` renames the parameter. |
| `storage` | Also remember it in `localStorage`. A bare `storage` uses the key `kazoku-lang`; `storage="my-key"` names it. A browser that keeps nothing still switches. |
| `theme` | `light` or `dark`: its own look, otherwise the page's. |

**Which language it starts in**, strongest first: the address, the store, `value`, the reader's languages (`navigator.languages`: a browser asking for `ja-JP` gets `ja`), what the
target's `lang` says now, then the first code of `languages`. A tag matches the code it names, or its main language (`ja-JP` is `ja`). A code the page did not list is never chosen.

`element.value` reads and sets it; `element.languages` is the list; `element.names = { fr: "Français (Canada)" }` replaces a name; `element.words = { group: "Choose a language" }` replaces the
label of the group (its own label is English or 日本語, by the chosen language). Colours are custom properties: `--kazoku-ink`, `--kazoku-surface`, `--kazoku-line`, `--kazoku-accent`; the parts are `group` and `button`.

Each button carries its own `lang`, so a screen reader says 日本語 in Japanese. The names of the family's languages are in `OWN_NAMES`; for any other code the name comes from `Intl.DisplayNames` in that language.

## The event

`kazoku-languagechange` is dispatched on the element (it bubbles and crosses shadow roots). `event.detail`:

| Field | Meaning |
|---|---|
| `lang` | The language now chosen: one of the codes, lower case. |
| `previous` | The one before; `undefined` at `init`. |
| `reason` | `init` (once, a moment after it connects, with the start), `user` (a button), `set` (the `value` property or attribute, or the list no longer holding the language), or `external` (something else wrote the target's `lang`). |
| `target` | The element the choice is written on. |

Something else writing `lang` on the target moves the picker with it, when the new value is one of its codes (`ja-JP` moves it to `ja`).

## Without the element

```js
import { startingLanguage, applyLanguage, languageName } from "@johnmorrisdotca/kazoku-ui/language-picker";

const lang = startingLanguage({ list: ["en", "ja"], search: location.search, storage: localStorage, preferred: navigator.languages });
applyLanguage(document.documentElement, lang);
languageName("ja"); // "日本語"
```

`parseLanguages(text)`, `matchLanguage(tag, list)`, `normaliseCode(text)`, `languageName(code, names?)` and the words import on a server.

## Content-Security-Policy

The styles are adopted as a constructable stylesheet (see [csp.md](csp.md)); `demo/csp.html` and `demo/csp-nonce.html` carry a picker under a strict `style-src`.

## Looking at it

48 px buttons, light and dark (it follows the page's `data-theme`, so it is dark when the theme switch forces dark). `pnpm test:demo` plays it in Chromium and WebKit at a phone's width and a desk's
(`e2e/language-picker.demo.mjs`): each name, `lang` on the page, the event for each reason, a reader whose browser asks for Japanese, the address, the store, a browser with no store,
another writer of `lang`, a changed list, a picker inside another element's shadow root. The demo's own page, view controls and theme switch answer to it.
