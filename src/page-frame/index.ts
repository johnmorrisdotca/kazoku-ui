// The page frame without the elements: the words of a page, the title and description a build writes, the HTML of the header, the credit line and the footer, and a check of a built page.
// Nothing here touches the DOM until a function is given a document, so it imports on a server and in a build script.
export const TAG = "kazoku-page-header";
export const CREDITS_TAG = "kazoku-page-credits";
export const FOOTER_TAG = "kazoku-page-footer";
export { pageProblems, type PageCheckOptions } from "./check.ts";
export { type CreditPart } from "../shared/credit-parts.ts";
export { pageCreditsHtml, pageFooterHtml, pageHeaderHtml, type PageCredits, type PageCreditsOptions, type PageFooterOptions, type PageHeaderOptions } from "./html.ts";
export { samePage } from "./link.ts";
export { applyPageMeta, pageHeadHtml, watchPageMeta } from "./meta.ts";
export { escapeHtml, pageTitle, pickText, type PageText, type PageTexts } from "./text.ts";
export { languageOf, WORDS, wordsFor, type Language, type PageFrameWords } from "./words.ts";
export { creditsText, licenceText, type DoorCredit, type DoorSourceInfo } from "../shared/door.ts";
