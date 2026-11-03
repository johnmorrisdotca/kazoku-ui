---
title: Accessibility and labels
section: explanation
order: 11
description: The rules every part follows for keyboards, touch, screen readers, reduced motion and colour, and the English and Japanese labels you can replace.
---

The rules are written once, in the repository's contributing guide, and a test or a demo check holds each. Every part follows them, and a page that uses the parts inherits them.

## What every part does

- **Controls on or right beside the view.** They are visible without scrolling, and changing a control never stops or resets the turn.
- **48 px touch targets** and no browser-default controls. On a phone the bar is compact and the words are left to a screen reader while the icons stay.
- **Keyboard.** The theme switch and the language picker are radio groups: one tab stop, arrow keys move the choice. The view takes arrows to turn and tip it, `+` and `-` to zoom, and `0` or Home for Front and Fit, once it has focus (give it a `tabindex`). The zoom slider has its own keys, Page Up and Page Down going from mark to mark.
- **Reduced motion.** A reader who prefers reduced motion gets no automatic turn and no animated Centre move.
- **Screen readers.** The zoom is announced politely once it has settled ("Zoom level 2.4×"), not on load and not for every step of a pinch. Each language button carries its own `lang`, so a screen reader says `日本語` in Japanese. The save buttons have a status line (Saved, Could not save).
- **Light and dark.** Every part follows the page's `data-theme` (forced) or the device's, so it is dark in a page forced dark on a light device. `theme="light"` or `theme="dark"` on one element gives it a look of its own.
- **No marks.** No brand, league, federation or sponsor mark is in the package.

## Labels in English and Japanese

`lang="ja"` (on the element or on a parent) chooses Japanese; anything else is English. Every key is in both languages, and a unit test holds that. Each part has its own table, `WORDS`, and `wordsFor(language, over?)` gives it with any of your own over it.

```js
import { WORDS as viewWords, languageOf, wordsFor } from "@johnmorrisdotca/kazoku-ui/view-controls";
import { WORDS as themeWords, wordsFor as themeWordsFor } from "@johnmorrisdotca/kazoku-ui/theme-switch";
import { WORDS as languageWords, wordsFor as languageWordsFor } from "@johnmorrisdotca/kazoku-ui/language-picker";
import { WORDS as saveWords, wordsFor as saveWordsFor } from "@johnmorrisdotca/kazoku-ui/save-image";

console.log(languageOf("ja-JP"), languageOf("en-CA"), languageOf("fr"));
console.log(Object.keys(viewWords.en).length === Object.keys(viewWords.ja).length);
console.log(wordsFor("en").front, wordsFor("en", { front: "Home" }).front, wordsFor("ja").front);
console.log(themeWordsFor("en").auto, themeWordsFor("en", { auto: "System" }).auto);
console.log(languageWordsFor("en").group.length > 0, saveWordsFor("en").png);
console.log(Object.keys(themeWords.en).join(" "), "|", Object.keys(languageWords.en).join(" "), "|", Object.keys(saveWords.en).join(" "));
// ja en en
// true
// Front Home 正面
// Auto System
// true Save PNG
// group light dark auto | group | group png svg saved failed
```

To replace labels on one element, assign `element.words = { front: "Home" }`. The view controls have 26 keys, among them `group`, `angle`, `tilt`, `autoTurn`, `front`, `zoom`, `zoomOut`, `zoomIn`, `fit`, `centre`, `pan`, `drag`, `dragMove`, `dragTurn`, `zoomLevel`, `zoomReset`, `more`, `speed`, `slow`, `medium` and `fast`. The theme switch has `group`, `light`, `dark` and `auto`; the language picker has one label for its group, because the languages themselves are never translated: each is written in its own language. The save buttons have `group`, `png`, `svg`, `saved` and `failed`. The full tables, with a reading and a meaning for each Japanese word, are in the repository's [labels page](../labels.md), the one page that shows both languages.

## The Japanese is written for the interface

The Japanese labels are written for the interface and have not yet been read by a native speaker. If you ship the parts to a Japanese audience, read the words in context and replace any with `words`; a replacement never touches the other labels.

## The drag rule

In every turnable view the surface under the pointer follows the pointer, the arrow keys agree, and Auto-turn goes the object's real way. `grab-radius` makes a drag keep the touched point under the pointer on a globe. The rule, the option and the shared browser check are in the repository's [drag rule](../drag-rule.md).

## Related

[View controls](view-controls.md) for every attribute, [Frameworks and CSP](frameworks-and-csp.md) for strict policies.
