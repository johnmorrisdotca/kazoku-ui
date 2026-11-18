// The time scrubber without the element: dates, scales and keys. Nothing here touches the DOM, so it imports on a server.
export { applyMove, clamp, coarserOf, DATE_KEY, DAY_MS, DEFAULT_FROM, DEFAULT_TO, daysIn, fieldText, fractionOf, isoDate, keyMove, momentAt, parseDate, partsOf, SCALES, scaleOf, stepBy, ticksFor, utc, valueText, windowFor, type KeyMove, type Scale } from "./scale.ts";
export { languageOf, WORDS, wordsFor, type Language, type ScrubberWords } from "./words.ts";
export const EVENT = "kazoku-timechange";
export const TAG = "kazoku-time-scrubber";
