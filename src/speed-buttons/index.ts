// The speed buttons without the element: the steps, how a speed reads and how one is chosen. Nothing here touches the DOM, so it imports on a server.
export { DEFAULT_STEPS, DEFAULT_UNIT, nearestStep, parseSpeed, parseSteps, SPEED_ADDRESS_KEY, speedText, startStep, stepFrom } from "./steps.ts";
export { languageOf, WORDS, wordsFor, type Language, type SpeedWords } from "./words.ts";
export const EVENT = "kazoku-speedchange";
export const TAG = "kazoku-speed-buttons";
