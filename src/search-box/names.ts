// The element's names, apart from the index so the element can use them without loading every helper the index re-exports.

/**
 * Fired on the element when the reader picks a result's action. `detail` is `{ id, group, action, pressed? }`.
 *
 * @example
 * box.addEventListener(EVENT, (event) => console.log(event.detail.action));
 */
export const EVENT = "kazoku-search-pick";
/**
 * The element's tag name.
 *
 * @example
 * document.createElement(TAG);
 */
export const TAG = "kazoku-search-box";
