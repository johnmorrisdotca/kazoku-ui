// The replay bar without the element: the address keys and the on/off reading. Nothing here touches the DOM, so it imports on a server.
export { addressKeys, DEFAULT_STEPS, flagOn, PLAY_KEY, REPEAT_KEY, SPEED_KEY } from "./state.ts";
export { languageOf, WORDS, wordsFor, type Language, type ReplayWords } from "./words.ts";
export const EVENT = "kazoku-replay";
export const TAG = "kazoku-replay-bar";
