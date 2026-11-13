---
title: Search box
section: how-to
order: 29
description: One box that searches several kinds of thing at once, with a few rows of each kind, kind chips, an icon and up to three actions on each result, and a preview of the highlighted result beside the list or in a sheet. Reachable by keyboard. English and Japanese.
---

`<kazoku-search-box>` is a search combobox for a page that has more than one kind of thing to find (stars, planets, craft, places, cities). The page's `source` answers in groups. The box draws a few rows of each group with its count, a row of kind chips narrows the list to one group, and each row can carry up to three actions (Show, Go, Favourite). It holds no data and never fetches: it asks the source, drops every answer but the newest, and tells the page what the reader picked.

It is its own element, not an extension of [the collection picker](collection-picker.md). The picker's contract is a list the page hands over once, a search over it in the browser, and a chosen list the reader edits. This box's contract is the opposite on all three counts: the answers are asynchronous and come in groups, nothing is searched here, and nothing is chosen, only picked (a row and an action, reported once). Bending one element to both would have left each half with options that mean nothing to the other.

```html
<script type="module">
  import "@johnmorrisdotca/kazoku-ui/search-box/define";
  const box = document.querySelector("kazoku-search-box");
  box.source = async (query) => [
    { id: "planets", label: "Planets", total: 1, rows: [{ id: "mars", label: "Mars", detail: "Planet", actions: [{ id: "show", label: "Show" }, { id: "fav", label: "Favourite", pressed: false }] }] },
  ];
  box.addEventListener("kazoku-search-pick", (event) => console.log(event.detail.id, event.detail.group, event.detail.action));
</script>

<kazoku-search-box lang="en"></kazoku-search-box>
```

## The source

`source` is a function `(query, { signal, group }) => groups`, or a promise of them. It is the only thing the box calls, and only because the reader typed or narrowed.

- A **group** is `{ id, label, total, rows }`. `label` is the kind's name in the reader's language. `total` is how many results the kind has in all, which may be more than `rows` holds; it is what the count, the chip and "See all N" say.
- A **row** is `{ id, label, detail, icon, preview, actions }`. `label` is the name, with the part the query matched marked. `detail` is a second line. `icon` and `preview` are in "Row icons" and "The preview pane" below.
- An **action** is `{ id, label, icon, pressed, disabled, title }`. A row carries up to three (more are ignored). `icon` is what the button wears (see "Action icons" below); left out, the button is small text. Leave `pressed` out for a plain button; set it to `true` or `false` for a toggle, which the box draws as a button with `aria-pressed` (an icon button whose picture fills when it is on). Set `disabled` to `true` for an action that cannot be done yet (a kind with nothing to do), and `title` to say why (see "A disabled action" below). A row with no actions has one, `open`, and a press on the row fires it.
- `group` is `""` for every group, or the id of the group the reader narrowed to (a chip, or "See all N"). With a group set, answer with that group's whole list (the box draws it in windows of 20), and send the other groups with `rows: []` and their `total` so the chips keep their counts.
- `signal` is aborted when a newer call replaces this one. A source that can stop its request passes it on; one that cannot is not harmed, because its late answer is dropped.

An empty box never calls the source. After the quiet time (`debounce`, 120 ms) a new call aborts the one before it, and an answer that comes back after a newer call has started is dropped, whether or not the source heard the abort.

## What the reader does

| Key | Does |
|---|---|
| Typing | Asks the source (after the quiet time) and opens the popup |
| Down, Up | Moves the active row; from the last row (or the first, going up) back to the box |
| Right, Left | With a row active, across its actions; at either end the caret moves as in any field |
| Enter | On the active row or action: fires it. A plain action closes the popup; a toggle keeps it open |
| Escape | Closes the popup; pressed again, empties the box |
| Home, End | Move the caret in the box, never the list |
| Tab | Out of the box to the kind chips (real buttons with a pressed state), then on |
| `/`, Control or Command and K | Focus the box, when `shortcut` names them (off by default) |

The active row stands for its **first** action: Enter does it, and so does a press on the row's text. Right moves to the second action, then the third, and Enter fires the one it stands on. So Favourite, as the last action, is two Right presses from the row. A page that puts Favourite first makes Enter toggle it.

`kazoku-search-pick` carries `{ id, group, action }` in `detail`, and `pressed` (the new state) for a toggle. The box flips a toggle's `aria-pressed` at once; the page keeps the real state, and its next answer says it. `setPressed(group, id, action, pressed)` syncs it without a new call.

## The compact look

The box is compact by default, and there is no roomy mode: a page that wants bigger things gets them from the reader's own pointer, not from an option.

- **A result is one line** about 40 px tall: the name with the match marked, and under it, quieter and smaller, the `detail`. A name or a detail that is too long ends in an ellipsis rather than wrapping.
- **Actions are icon buttons** on the right of the row, all one size (30 px), never wrapping under the name. Each has a tooltip (the action's `label`, or a disabled action's `title`) and the accessible name `label row` (`Favourite Mars`). A toggle's star is an outline that fills, and turns to the accent colour, when it is on. An action with no `icon` is a small text button (28 px, rounded corners, not a pill).
- **A row too narrow for its actions** keeps as many as fit and puts the last ones behind one **More actions** button. A press on it opens them as a line of small buttons under the row. The keyboard does not need the button: Right still moves across every action, behind the button or not, and the row opens that line while the arrows stand on one of them.
- **The kind chips** are one row of small chips (24 px). When they do not fit they scroll sideways, with a fade at each edge that has more beyond it, and the counts are drawn in a lighter weight. Tab moves between them as before.
- **A group's heading** is small, with its count, and `See all N` is on the same line at the right, not below the rows.
- **On a finger** (`pointer: coarse`) every row, icon button, chip and `See all` grows to a 44 px target.

## Action icons

`icon` on an action is one of the built-in names, or the page's own path data.

| `icon` | Draws |
|---|---|
| `"star"` | A star outline; it fills when a toggle is on |
| `"show"` (or `"eye"`) | An eye |
| `"go"` (or `"arrow"`) | An arrow |
| `"dot"` | A small dot, for an action with no picture of its own |
| `{ path: "M4 12h16" }` | The page's own picture: SVG path data on a 24 by 24 grid, one string or an array of up to six. It is stroked 1.75 wide with round ends, the same as the built-in ones, and a toggle that is on fills it |

An unknown name, and path data that is not safe, are drawn as the dot, so a mistake is seen and nothing is dropped. The box builds the picture node by node from the path data and never from a string of markup, and it accepts only the path commands (`MLHVCSQTAZ`, either case), numbers, signs, commas and spaces, up to 800 characters, so a page's icon cannot add an element, an attribute or a script. The picture is hidden from a screen reader; the button's name comes from `label`.

```html
<script type="module">
  import "@johnmorrisdotca/kazoku-ui/search-box/define";
  const box = document.querySelector("kazoku-search-box");
  box.source = async () => [
    { id: "planets", label: "Planets", total: 1, rows: [{ id: "mars", label: "Mars", detail: "Planet", actions: [
      { id: "show", label: "Show", icon: "show" },
      { id: "go", label: "Go", icon: { path: ["M4.5 12h14", "M13 6.5l5.5 5.5-5.5 5.5"] } },
      { id: "fav", label: "Favourite", icon: "star", pressed: false },
    ] }] },
  ];
</script>

<kazoku-search-box lang="en"></kazoku-search-box>
```

## A disabled action

`{ id: "go", label: "Go", disabled: true, title: "Maps of places are not ready yet" }` draws the button dimmed, with `aria-disabled="true"` (not the `disabled` attribute, so the button keeps its tooltip), and `title` as its tooltip. The same text is its accessible description, so a reader who arrows onto it hears the action, the row and then why. Enter, a press, and a press on the row's text (when it is the row's first action) do nothing and send no `kazoku-search-pick`; the popup stays open. The arrow keys still reach it, so the reason can be heard. `disabled` left out or `false` is an ordinary action, and `title` alone only adds the tooltip and the description.

```html
<script type="module">
  import "@johnmorrisdotca/kazoku-ui/search-box/define";
  const box = document.querySelector("kazoku-search-box");
  box.source = async () => [
    { id: "places", label: "Places", total: 1, rows: [{ id: "gale", label: "Gale Crater", actions: [{ id: "go", label: "Go", disabled: true, title: "Maps of places are not ready yet" }] }] },
  ];
</script>

<kazoku-search-box lang="en" placeholder="Search stars, planets, craft, cities"></kazoku-search-box>
```

## A toggle's change is spoken

Focus stays in the input, and a screen reader rarely says `aria-pressed` for an active descendant, so the box says a toggle's new state itself, politely, through its own status line: the action, the row, then `on` or `off` (`Favourite Mars, on`, `お気に入り 火星、オン`). It is said when the reader changes it, by a key or a press, and not when the page calls `setPressed`, which has not been asked for by the reader. The words are `on` and `off` in the table below, and can be replaced with `wordsFor`.

## Row icons

`icon` on a row is drawn 20 px square before its name, in a box of fixed size, so the names line up and nothing moves when a picture loads. A row without one keeps the space when any row in the answer has one. It is decoration: hidden from a screen reader, which hears the name.

| `icon` | Draws |
|---|---|
| `"disc"`, `"ring"`, `"star"`, `"dot"`, `"square"` | A built-in shape in the row's text colour; the disc, star, dot and square are filled, the ring is an outline |
| `{ name: "disc", color: "#c1440e" }` | A built-in shape in the page's colour: a planet in its own colour, a star in its |
| `{ path: ["M12 3.5l4.5 13-4.5-2.8-4.5 2.8z"], filled: true, color: "#7a8a99" }` | The page's own path data on a 24 by 24 grid (one string, or up to six), stroked, or filled when `filled` is true |
| `{ text: "🇯🇵" }` | A few characters (up to eight): a flag, a letter, a symbol. `color` works here too |
| `{ src: "/flags/jp.svg" }` | A picture's address, loaded lazily into the same 20 px box; one that fails to load is removed and leaves the box empty |

A colour is checked: a hex colour, a colour name, or `rgb()`, `hsl()`, `hwb()`, `lab()`, `lch()`, `oklab()` or `oklch()` with plain numbers. Anything else (a `var()`, a `url()`, anything with a semicolon) is ignored and the text colour is used. An address must be relative, `https:` or `http:`, or a small `data:` PNG, JPEG, WebP, GIF or AVIF; any other scheme is dropped and the row has no icon. The box sets the colour through the element's style object and builds the picture node by node, never from markup, so a strict Content-Security-Policy is unaffected. `rowIconSpec(icon)`, `isSafeColor` and `isSafeImageUrl` are exported.

## The preview pane

A row can carry a `preview`, and the page can set `loadPreview` for the rows that do not. When either is there, the highlighted row's preview is drawn next to the list: arrow keys or a mouse over a row highlight it. Without them the box is as it was; `preview="off"` turns the pane off even when they are set.

A **preview** is `{ title, kind, facts, picture, pictureAlt, element }`, every part optional. The pane draws the picture's box (a fixed 16 to 10 box, so nothing moves when a picture loads), then an icon, the name and the kind, then up to eight `facts` (`{ label, value }`, drawn as a term and its description, values as text and never markup), then the row's actions as labelled buttons. The name is the row's `label` and the kind is the group's label unless the preview gives its own. `picture` is an address (checked as a row icon's is) loaded when the preview is shown; `element` is a node the page made, drawn in the same box instead, and kept for the next time that row is highlighted. The node is drawn inside the box's own shadow tree, so the page's stylesheet does not reach it: give it its own size and look (a canvas, an SVG, or an element with its style set through its style object, which a strict Content-Security-Policy allows). A preview with nothing in it shows the row's name, icon and kind.

There are two ways to give a row its preview:

- **Carried by the row**: `row.preview` is an object, drawn at once. It is not kept: the page may send a newer one with its next answer. Use it when the answer already holds the facts.
- **Asked for**: `row.preview` is a function, or the page sets `box.loadPreview`, a function `(row, { signal, group }) => preview` or a promise of one. It is the only thing that fetches, and what it does is bounded:
  - Nothing is asked for a row that is not highlighted. A list of a thousand rows asks for none.
  - After a row is highlighted the box waits for a quiet time (`preview-delay`, 150 ms), so moving through rows with the arrow keys asks for the one the reader stops on and not for the ones passed.
  - Moving on aborts the call (`signal`). A function that cannot stop its request is not harmed: its late answer is dropped.
  - An answer is kept by the row's group, id and the language, up to 200, the oldest used going first, so a row highlighted again shows at once and asks for nothing. `clearPreviews()` forgets them all (call it when the data changes).
  - While a call is out, the pane keeps the last preview: nothing blanks. If the call takes over 300 ms the pane dims what it shows, to say it is the last row's. With nothing shown yet it says `Loading…`.
  - A call that fails is shown as the row's name and kind with `The preview could not be loaded.`, and is not kept, so highlighting the row again asks again.
  - The answer is used as it comes: `undefined` means nothing more is known.

```html
<script type="module">
  import "@johnmorrisdotca/kazoku-ui/search-box/define";
  const box = document.querySelector("kazoku-search-box");
  box.source = async () => [
    { id: "planets", label: "Planets", total: 2, rows: [
      { id: "mars", label: "Mars", detail: "Planet", icon: { name: "disc", color: "#c1440e" }, actions: [{ id: "show", label: "Show", icon: "show" }] },
      // this one carries its preview: shown at once, nothing asked for
      { id: "venus", label: "Venus", detail: "Planet", icon: { name: "disc", color: "#e6c27a" }, preview: { facts: [{ label: "Moons", value: "0" }] } },
    ] },
  ];
  // the others are asked for when highlighted, once, with a way to stop
  box.loadPreview = async (row, { signal }) => ({
    kind: "Planet",
    facts: [{ label: "Moons", value: row.id === "mars" ? "2" : "?" }, { label: "Day", value: "24.6 h" }],
  });
</script>

<kazoku-search-box lang="en"></kazoku-search-box>
```

### Where it goes

| The popup is | The preview is | The reader |
|---|---|---|
| at least 540 px wide | A second column beside the list, sticky while the list scrolls. A box narrower than that grows its popup to about 672 px when the page has room to the right of it | Highlights with the arrow keys or the mouse over a row; the pane follows. A touch screen (a coarse pointer) also gets a Details action on each row, which highlights it |
| narrower | No pane. Each row has one more action at the end, **Details** (an `i` icon), that opens the preview as a sheet in place of the list, with a **Back to results** button | Presses Details, or arrows across the actions to it and presses Enter; Escape closes the sheet first, then the popup. Nothing is asked for until the sheet opens |

Details is an action like the page's own (a cell in the grid, so Right reaches it) but it never sends `kazoku-search-pick`. The layout is worked out from the box's own width and the room to its right, and again when either changes; the highlighted row is kept when it flips. The width threshold is not an option: a page that wants the pane on a small box makes the box wider.

### What a screen reader and a keyboard get

Focus never leaves the input and the pane is not a trap. The pane is a `region` named `Preview`; while a row (or one of its actions) is the active descendant, the pane is that cell's description (`aria-describedby`), so a screen reader hears the row and then its preview. While a request is out the pane has `aria-busy`. Its own buttons (the actions again, for a pointer) are out of the tab order and hidden from a screen reader, which has the same actions in the grid; a toggle's state is kept in step with the row's. With the sheet open the box names no active descendant, because the list is out of the page, and says `Preview, Mars` politely. The pane draws nothing for a row until it is highlighted, and goes back to its hint, `Point at a result, or move to one with the arrow keys, to preview it.`, whenever the popup closes or a new answer arrives.

### The loader without the element

`createPreviewLoader` is the same logic with no DOM: highlight a key and a row, and it calls `onShow` with the preview to draw, from the row, from the cache or from the function, after the quiet time, dropping stale answers. A test turns its clock by hand through `timers`. `previewView(row, groupLabel, preview)` is the checked form the pane draws.

```ts
import { createPreviewLoader } from "@johnmorrisdotca/kazoku-ui/search-box";

const loader = createPreviewLoader({
  debounceMs: 0,
  staleMs: 300,
  cacheSize: 100,
  fallback: () => async (row) => ({ facts: [{ label: "Id", value: row.id }] }),
  onShow: (target, preview) => console.log("show", target.row.id, preview?.facts?.[0]?.value),
});
loader.highlight("planets\u0000mars", { id: "mars", label: "Mars" }, "planets");
```

## How it is built for a screen reader

The input is a combobox with `aria-haspopup="grid"`, and the popup is a grid: each group is a `rowgroup` named with its kind and count (`Stars 5`), above a header row, each result is a `row` with a `gridcell` for its text and one for each action. Focus stays in the input the whole time; `aria-activedescendant` always names a `gridcell`: the active row's text cell, which stands for its first action, or the cell of the active action once the arrows have moved across it. The active row and that cell have `aria-selected`. While a reader is composing text with an input method, the arrow keys and Enter belong to it and the box leaves them alone. A grid, not a listbox, because options cannot hold buttons. A polite status line says the count when an answer arrives (`15 results: Stars 1, Planets 1, …`, and `Cities, 49 results` once narrowed).

Moving the active row sets attributes and nothing else: the rows are not drawn again. The rows are drawn once per answer, and only what is shown: a few rows of each group, or one window of a narrowed group, so a source that returns thousands of rows costs the page a screenful of nodes.

## Narrowing

The chips are `All` and one button for each group the answer has, each with its count, `aria-pressed` on the one chosen. Pressing a chip, or the "See all N" row of a group, asks the source again with that group. A narrowed group shows 20 rows and a "Show more" row for the next 20. Pressing the chosen chip again, or `All`, brings every group back.

## Attributes and properties

| | |
|---|---|
| `source` | The page's search function |
| `value` | What is in the box; setting it asks the source |
| `lang` | `en` or `ja`; left out, the page's language |
| `theme` | `light`, `dark`, or left out |
| `debounce` | Quiet time in ms before a call (120) |
| `per-group` | Rows each group shows (3) |
| `window` | Rows a narrowed group shows at a time (20) |
| `preview` | `off` turns the preview pane and the Details action off; left out, they are on when a row carries a preview or `loadPreview` is set |
| `preview-delay` | Quiet time in ms after a row is highlighted before its preview is asked for (150) |
| `placeholder` | The hint in the empty box. Left out or empty, the word for Search in the box's language (`Search`, `検索`); set, it is shown as written, in any language. Also a property: it reads as the text shown, and setting it writes the attribute. The box's accessible name stays `Search` |
| `shortcut` | Keys that focus the box: `/`, `mod+k` (Control or Command), `ctrl+k`, `meta+k`, `alt+s`, several with spaces. Never takes a key while the reader types in a field |

`loadPreview` is a property (see "The preview pane"); `clearPreviews()` forgets the kept previews. `close()` closes the popup, `clear()` empties the box, `focus()` focuses it. It is themed through the family's `--kazoku-ink`, `--kazoku-surface`, `--kazoku-line` and `--kazoku-accent`, in light and dark. The popup fills the box's width, and on a finger every target is at least 44 px (see "The compact look"). Nothing moves, so there is no motion to turn off.

## Words

The words come in English and Japanese; every key is in both (`WORDS`, `wordsFor(language, overrides)`).

| Key | English | 日本語 |
|---|---|---|
| `search` | Search | 検索 |
| `kinds` | Kinds | 種類 |
| `all` | All | すべて |
| `seeAll` | See all {n} | {n}件すべてを見る |
| `showMore` | Show more | もっと見る |
| `empty` | No matches | 一致するものはありません |
| `searching` | Searching… | 検索中… |
| `failed` | The search failed | 検索できませんでした |
| `results` | Results | 検索結果 |
| `countOne`, `countMany` | {n} result, {n} results | {n}件 |
| `announce` | {count}: {kinds} | {count}：{kinds} |
| `kindCount` | {label} {n} | {label}{n}件 |
| `join` | , | 、 |
| `open` | Open | 開く |
| `more` | More actions | その他の操作 |
| `on` | on | オン |
| `off` | off | オフ |
| `preview` | Preview | プレビュー |
| `previewHint` | Point at a result, or move to one with the arrow keys, to preview it. | 結果にポインターを合わせるか、矢印キーで選ぶと、プレビューが表示されます。 |
| `previewLoading` | Loading… | 読み込み中… |
| `previewFailed` | The preview could not be loaded. | プレビューを読み込めませんでした。 |
| `details` | Details | 詳細 |
| `back` | Back to results | 結果に戻る |

Result names are not here: the source returns them in the reader's language.

## Ranking and the marked part

Without the element, the pure helpers rank a list the page holds and cut a name where the query matched. `rank(query, name, aliases)` is `RANK.exact` (4), `RANK.prefix` (3), `RANK.wordStart` (2), `RANK.contains` (1) or `RANK.none` (0), the best of the name and its aliases. Case, accents, full-width against half-width forms, and katakana against hiragana are folded, so `ｍａｒｓ` finds `Mars` and `とうきょう` finds `トウキョウ`. `highlight(text, query)` gives the pieces of `text` with the matched ones marked, which the box draws as `<mark>`.

```ts
import { createSearchRunner, highlight, rank, RANK } from "@johnmorrisdotca/kazoku-ui/search-box";

console.log(rank("mar", "Mars"), rank("ｍａｒｓ", "Mars") === RANK.exact, rank("かた", "カタカナ"));
console.log(highlight("Mars Orbiter", "orb").map((piece) => (piece.match ? `[${piece.text}]` : piece.text)).join(""));

const runner = createSearchRunner({
  debounceMs: 0,
  source: () => (query) => [{ id: "stars", label: "Stars", total: 1, rows: [{ id: query, label: query }] }],
  onAnswer: (groups) => console.log("answered", groups[0]?.rows[0]?.id),
});
runner.request("vega");
```

Also exported: `createPreviewLoader`, `previewView`, `rowIconSpec`, `isSafeColor`, `isSafeImageUrl`, `MAX_FACTS`, `MAX_ICON_TEXT`, `ROW_ICON_NAMES`, `PREVIEW_ACTION_ID`, `iconPaths`, `isSafePath`, `MAX_ICON_PATH` (800), `SEARCH_ICONS`, `SEARCH_ICON_NAMES`, `actionsFit` (how many of a row's actions fit on its line), `planLines` (what is drawn for an answer), `chipsOf`, `announcement`, `toggleAnnouncement`, `isActionEnabled`, `actionsOf`, `stepIndex`, `MAX_ACTIONS`, `countPhrase`, `languageOf`, `EVENT` and `TAG`. `SearchBoxElement` is the class, and `defineSearchBox` registers the tag and does nothing if it is already taken.
