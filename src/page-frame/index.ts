// The page frame without the elements: the words of a page, the title and description a build writes, the HTML of the header and the credit line, and a check of a built page.
// Nothing here touches the DOM until a function is given a document, so it imports on a server and in a build script.
export const TAG = "kazoku-page-header";
export const CREDITS_TAG = "kazoku-page-credits";
export { pageProblems, type PageCheckOptions } from "./check.ts";
export { pageCreditsHtml, pageHeaderHtml, type PageCredits, type PageCreditsOptions, type PageHeaderOptions } from "./html.ts";
export { samePage } from "./link.ts";
export { applyPageMeta, pageHeadHtml, watchPageMeta } from "./meta.ts";
export { escapeHtml, pageTitle, pickText, type PageText, type PageTexts } from "./text.ts";
export { languageOf, WORDS, wordsFor, type Language, type PageFrameWords } from "./words.ts";
