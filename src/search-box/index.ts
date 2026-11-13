// The search box without the element: ranking, the marked part of a name, the plan of what is drawn, the stale-answer guard, the preview loader and the words. Nothing here touches the DOM, so it imports on a server.
export { highlight, rank, RANK, type Rank, type Segment } from "./rank.ts";
export { iconPaths, isSafeColor, isSafeImageUrl, isSafePath, MAX_ICON_PATH, MAX_ICON_TEXT, ROW_ICON_NAMES, rowIconSpec, SEARCH_ICON_NAMES, SEARCH_ICONS, type RowIcon, type RowIconImage, type RowIconName, type RowIconNamed, type RowIconShape, type RowIconSpec, type RowIconText, type SearchIcon, type SearchIconName, type SearchIconPath } from "./icons.ts";
export { actionsFit, actionsOf, announcement, chipsOf, isActionEnabled, MAX_ACTIONS, MAX_FACTS, planLines, PREVIEW_ACTION_ID, previewView, stepIndex, toggleAnnouncement, type PlanLine, type PreviewContext, type PreviewView, type SearchAction, type SearchContext, type SearchFact, type SearchGroup, type SearchPickDetail, type SearchPreview, type SearchPreviewSource, type SearchRow, type SearchSource } from "./model.ts";
export { createPreviewLoader, type PreviewLoader, type PreviewLoaderOptions, type PreviewTarget } from "./preview.ts";
export { createSearchRunner, type SearchRunner, type SearchRunnerOptions, type SearchTimers } from "./runner.ts";
export { countPhrase, languageOf, WORDS, wordsFor, type Language, type SearchBoxWords } from "./words.ts";

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
