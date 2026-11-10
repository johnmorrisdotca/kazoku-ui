---
title: The data door
section: how-to
order: 25
description: How a package takes outside data (more stars, objects, maps, small bodies) as a source with its own licence and credit, and the four small functions every package shares to check it, credit it, read it and budget its tiles.
---

A package draws, and the caller supplies the data. Outside data comes into a package through one door, a **source**: a small typed object that carries its own licence and credit. A page can then always say whose data is on the screen right now. With no source a package draws exactly what it drew before, from its own bundled data.

The door is one file, [`templates/data-door.ts`](../../templates/data-door.ts): types and four small functions, with no DOM and no three.js. A package that takes outside data copies it **unchanged** to `src/data-door.ts`, and `scripts/check-standard.mjs` fails `pnpm check` when the copy differs. It is a copy and not an import so that a package with no runtime dependencies keeps none.

## Two kinds of source

A **records** source is a list that fits in memory: at most 200,000 records, read once when the source is added, then frozen. A **tiles** source is data cut by place and by detail and fetched only for what the view shows: `need(place, detail)` names the tile keys (pure, no fetching), `load(key, signal)` fetches one, `bytes(tile)` says what it holds in memory. Place and detail are the package's own types. For a map piece (a sky picture, a planet's surface, the Earth's day picture) every package uses one shape: `MapPlace` in degrees, a detail that is the pixels across the whole circumference, and an `ImageTile`.

Every source says who it is in `info`: an `id` (lower-case letters, digits and hyphens, unique in a view), a `name` and a `credit` in English and Japanese, the `licence` (a name and a link, with `nonCommercial` or `shareAlike` when it is so), the source's own page and the day it was retrieved.

```ts
import type { RecordSource } from "./data-door.ts";

const mine: RecordSource<{ ra: number; dec: number; mag: number }> = {
  kind: "records",
  info: {
    id: "my-catalogue",
    name: { en: "My catalogue", ja: "私のカタログ" },
    credit: { en: "My catalogue, A. Person (2026)", ja: "私のカタログ（A. Person、2026年）" },
    licence: { name: "CC BY 4.0", url: "https://creativecommons.org/licenses/by/4.0/" },
    url: "https://example.org/my-catalogue",
    retrieved: "2026-11-10",
  },
  records: () => fetch("/my-catalogue.json").then((response) => response.json()),
};
```

## The four functions

- **`validateSource(source, taken)`** throws a `TypeError` for an empty credit (in either language), a licence with no name or no link, a bad id, an id already in `taken`, a missing day or page, or a missing function. A view calls it in `addSource`, so a bad source is refused at once and not at the first draw.
- **`creditLine(credits, language)`** writes the credit line for what the view drew: "Yale Bright Star Catalogue (Public domain); UCAC4 (CC0 1.0)." The package's own sources come first. It always prints the licence name, and says "non-commercial" or "share-alike" whenever the source does, so a page cannot hide the terms of the data it uses. Japanese puts the licence in （）and joins with ／.
- **`loadRecords(source, signal, finite)`** reads a record list once and never throws. It freezes the list, refuses more than 200,000 records (bigger data must be tiles), and skips and counts a record with a `NaN` or an infinity in any number `finite` names. A source that throws or rejects is a failed read; an aborted read is `aborted`.
- **`createTileStore(options)`** loads tiles by key under one byte budget (default 48 MB for all sources, a picture counting with its mipmaps, 4/3 of its bytes). At most 6 loads run at once for a source. A load starts only because the keys changed: asking again at rest sends nothing, and a tile that failed is tried again at the next change, not on a timer (a caller that means "once more, the same keys" passes `again`). The least recently used tile goes first, never one the view needs; a tile that does not fit even so is refused and counted, so the held bytes never pass the budget (a `maxTiles` option caps the count too). A tile that throws, comes back empty or reports a size that is not a number is counted in `failed` and never held, so it is never drawn. `drop(id)` aborts the source's loads and frees its tiles.

```ts
import { createTileStore, creditLine, validateSource } from "./data-door.ts";

const store = createTileStore<Tile>({ onChange: draw });
const sources: StarSource[] = [];

function addSource(source: StarSource): () => void {
  validateSource(source, sources.map((one) => one.info.id)); // throws at once
  sources.push(source);
  draw();
  return () => {
    sources.splice(sources.indexOf(source), 1);
    store.drop(source.info.id); // aborts its loads, frees its tiles
    draw();
  };
}

function draw(): void {
  for (const source of sources) {
    const held = store.want(source, source.need(place, detail)); // draws what is held; the rest arrives through onChange
    // draw `held`, skipping and counting any non-finite number in a tile
  }
  footer.textContent = creditLine(creditsOfLastFrame(), language);
}
```

## What a view does with it

Every view takes `sources` (a property, never an attribute, because data is not text) and `addSource(source)`, which returns a `remove()`. It can be switched off with `remove()`, `removeSource(id)` and `enableSource(id, false)`, and `data="own"` ignores every outside source at once. Off aborts the source's loads, frees its tiles, redraws and drops its credit. `view.credits()` lists the sources that gave at least one mark or tile to the last drawn frame, the package's own first, and a change in that set fires an event with `{ credits }`.

A package's own data is a source too, so that one path writes the credit line for both. The package's bundled sources must be clear to pass on: a test fails if one is non-commercial or share-alike. A caller's source may be either, and the line says so.

## Adopting it

1. Copy the template: `cp ../kazoku-ui/templates/data-door.ts src/data-door.ts`.
2. Run `pnpm check`. The standard check (`data-door` in the list) compares the copy with the template's recorded hash.
3. Add the tests the design asks of every package: no source draws what it drew before; a fake source draws more, with its credit in English and Japanese; off returns to the first picture and frees the memory; bad input is refused or counted, never drawn; at rest nothing is requested; the budget holds; the bundled sources are clear; the copy equals the template.

```sh
cp ../kazoku-ui/templates/data-door.ts src/data-door.ts
pnpm check
```

A change to the template is a change in this repository, with its new hash in `templates/check-standard.mjs` (a kazoku-ui test holds the two together), and then a new copy in every package.
