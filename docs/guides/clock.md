---
title: The family clock
section: how-to
order: 24
description: One moment, one speed and running or paused for every view on a page: it counts the time that really passed, opens moving at the focused body's speed, waits for Play under reduced motion, and views follow it from outside.
---

`@johnmorrisdotca/kazoku-ui/clock` is the family's one clock. It holds a **moment** (milliseconds since 1970, UTC), a **speed** (game seconds for each real second) and whether it **runs**. It was wakusei-planets' `GameClock`, moved here so that every package and the shared scene read the same moment. It has no DOM, so it imports on a server.

```ts no-check
import { createFamilyClock } from "@johnmorrisdotca/kazoku-ui/clock";

const clock = createFamilyClock({ start: Date.UTC(2026, 0, 1), speed: 3600 });
clock.advance();      // the moment as of this look: an hour of game time for each real second
clock.pause();        // the moment is held; the speed (3600) is kept
clock.play();         // runs on from the moment held
clock.set("now");     // follow the wall clock again
const stop = clock.onChange(({ time, running, reason }) => console.log(reason, new Date(time).toISOString(), running));
stop();
```

## The rules it keeps

- **It counts real passed time, not frame steps.** `advance(now)` adds the time that really passed since the last look, at the speed it ran at. At 86,400 times real time it moves a day for every real second on any machine, so a view drawn five times a second keeps the same time (within 1%) as one drawn sixty. It has no cap of its own: a page that was out of sight finds the moment where the speed would have taken it.
- **A pause holds the moment.** `pause` keeps the moment and the speed; `play` runs on from that moment, and the time that was paused is not counted. (A clock that followed the wall clock does not jump to it on Play.) A speed of 0 also holds; `play` after it goes back to the speed the clock had.
- **`running`** is true when the clock is neither paused nor at speed 0.
- **`onChange`** hears a `"tick"` at most four times a second (and none while the clock is paused or the tab is hidden), and each `"set"`, `"speed"`, `"play"` and `"pause"` at once. A tick is sent from `advance`, so a page that draws no frame hears none.

## It opens moving

`createFamilyClock()` with no options starts at the real time, **running**, at speed 1. A page with a body in focus tells it that body's **opening speed** (the speed at which that body's motion first shows) with `openAt(speed)`, which `composeScene` does for you when the focus changes. `openAt` is taken only while the reader has not touched the speed: `setSpeed` (the reader's choice, from the speed buttons) or a `speed` in the link sets `touched`, and from then on `openAt` leaves the speed alone. So moving the focus from the Earth to Mars changes the pace of a clock nobody has set, and never of one somebody has.

- **A link is obeyed.** `readClockAddress("?time=2026-11-10T12:00:00Z&speed=3600&play=off")` gives `{ start, speed, paused }` for `createFamilyClock`. `time` is `now`, a number of milliseconds or a date and time; `play` is `on` or `off`. `clockAddress(clock)` gives the keys that say where a clock is (`time`, `speed`, `play`), for `applyParams` or an address writer, and `CLOCK_KEYS` names them.
- **Reduced motion is a still view with Play ready.** For a reader whose system asks for reduced motion (`prefersReducedMotion()`, read by default; `reducedMotion` in the options overrides it) the clock opens **paused**, at its opening speed, and Play starts it. A link's `play=on` or `play=off` wins. The replay bar's `user-play` attribute makes its Play button work under reduced motion, since nothing starts by itself.

## A view follows an outside clock

A package's element holds a `ClockSlot` from `createClockSlot(options)`. The element reads `slot.clock` at each draw and asks to be drawn again when `slot.onChange` fires. A page that wants one clock for many views calls `slot.attach(sharedClock)` on each; the element then ignores its own `time` and `speed` attributes (a write to either goes to `slot.clock`). `slot.detach()` makes an own clock that starts from the moment, the speed and the pause the shared one had, and returns it.

```ts no-check
import { createClockSlot, createFamilyClock } from "@johnmorrisdotca/kazoku-ui/clock";

const shared = createFamilyClock();
const slot = createClockSlot({ start: Date.UTC(2026, 0, 1) });   // the view's own clock until it is handed another
const stop = slot.onChange(() => requestDraw());
slot.attach(shared);
slot.clock.time;    // shared's moment
slot.detach();      // an own clock, from that moment, at that speed
stop();
```

## The test clock

`createFamilyClock({ source })` takes the page's two clocks as `{ now, wall, hidden? }`, so a test can give it one that moves five frames a second, or a hidden tab. `browserSource()` is the default.

## The parts

| Import | What it is |
| --- | --- |
| `clock` | `createFamilyClock`, `createClockSlot`, `readClockAddress`, `clockAddress`, `CLOCK_KEYS`, `prefersReducedMotion` and `browserSource`, with their types. No DOM. |
