---
title: Time scrubber
section: how-to
order: 31
description: A date slider that goes from years down to days, with a date field, for a replay bar or any view that moves through time; arrow keys, Page keys, a mouse, a finger, English and Japanese.
---

`<kazoku-time-scrubber>` is a slider over a range of dates and a field to type one. It moves nothing itself: the page hears `kazoku-timechange` and shows that day.

```html
<script type="module">
  import "@johnmorrisdotca/kazoku-ui/time-scrubber/define";
</script>

<kazoku-time-scrubber from="1957-10-04" to="2030-12-31" value="2026-11-17" address></kazoku-time-scrubber>
```

## From years down to days

A range of seventy years cannot be dragged to a single day on a phone, so the slider has three scales, and the Year, Month and Day buttons choose one.

| Scale | The track shows | One arrow key | Page Up and Page Down |
| --- | --- | --- | --- |
| Year | the whole range | one year | ten years |
| Month | the current year | one month | one year |
| Day | the current month | one day | one month |

A press or a drag on the track picks the year, month or day under the pointer and keeps the finer parts (a drag at the Month scale keeps the day). Home and End go to the first and last day of the range. A step that lands past the end of a month (31 January plus a month) takes the month's last day. Nothing needs hover, and a drag works with a mouse, a finger or a pen.

## The date field

The field reads `2026-11-17`, `2026/11/17`, `2026年11月17日`, `2026-11` (the 1st) and `2026` (1 January), full-width digits too. Enter, or leaving the field, applies it. A date that does not exist (`2026-02-30`) is refused with a message and the field keeps what was typed; Escape gives the date back. A date outside the range is moved to its nearest end. `no-field` leaves the field out.

## Attributes and events

`from` and `to` are the range (1900-01-01 to 2100-12-31 if left out). `value` is the day and `scale` is `year`, `month` or `day`. `address` keeps the day as `date=2026-11-17` and the scale as `date-scale=day` (`address-key` renames the first; the scale follows it as `<key>-scale`). `label` names the whole control. The element also has the properties `value` (milliseconds, UTC midnight) and `scale`, and `words` for your own labels.

`kazoku-timechange` carries `{ value, date, scale, reason }`. `reason` is `init`, `user` or `set`. It bubbles and crosses shadow roots.

The slider is `role="slider"` with `aria-valuemin`, `aria-valuemax` and `aria-valuenow` in milliseconds and an `aria-valuetext` that says the date at the current scale (`2026`, `November 2026`, `17 November 2026`; `2026年11月17日` in Japanese).

## In the replay bar

Add `scrub` to `<kazoku-replay-bar>` and the slider takes a line under the buttons: `range-from` and `range-to` are the range, `date` the day, `date-scale` the scale. Moving it never plays, pauses or restarts the replay, and the page hears the same `kazoku-timechange`.

```html
<script type="module">
  import "@johnmorrisdotca/kazoku-ui/replay-bar/define";
</script>

<kazoku-replay-bar scrub range-from="1957-10-04" range-to="2030-12-31" date="2026-11-17" address></kazoku-replay-bar>
```

## The parts

| Import | What it is |
| --- | --- |
| `time-scrubber/define` | Runs `defineTimeScrubber()`, which registers `<kazoku-time-scrubber>` only when the name is free. |
| `time-scrubber/element` | The class `TimeScrubberElement`, to register it yourself. |
| `time-scrubber` | The pure side, with no DOM: reading and writing a date (`parseDate`, `isoDate`, `fieldText`, `valueText`, `partsOf`, `daysIn`), stepping it (`stepBy`, `keyMove`, `applyMove`, `coarserOf`), the track (`windowFor`, `fractionOf`, `momentAt`, `ticksFor`), the scales (`SCALES`, `scaleOf`), the defaults (`DATE_KEY` is `date`, `DEFAULT_FROM`, `DEFAULT_TO`, `DAY_MS`) and the words. |
