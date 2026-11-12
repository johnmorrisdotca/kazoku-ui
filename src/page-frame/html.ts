// The header and the credit line as HTML a build writes into the page, so the built file holds the words (and a link to home) before any script runs. The element
// takes over when its script loads and says the same things again in the reader's language; what is written inside the tag is what shows until then, or without script.
import { type CreditPart, creditPieces, creditText, safeHref } from "../shared/credit-parts.ts";
import { escapeHtml, pickText, type PageTexts } from "./text.ts";
import { wordsFor, type Language, type PageFrameWords } from "./words.ts";

/**
 * What the page says in each language about its credits: the line itself, or its pieces (a text or `{ text, href }`) so a
 * licence and its source can each be a link (only an http, https or relative address links). English is required.
 */
export interface PageCredits {
  en: string | readonly CreditPart[];
  ja?: string | readonly CreditPart[];
}

/** A line, or its pieces, as text with no links (the `credits` attributes and a screen reader's words). */
const plain = (line: string | readonly CreditPart[] | undefined): string | undefined => (line === undefined ? undefined : typeof line === "string" ? line : creditText(line));
/** A line, or its pieces, as HTML: the texts escaped, and links where the address may link, each opening in a tab of its own. */
const lineHtml = (line: string | readonly CreditPart[]): string =>
  typeof line === "string"
    ? escapeHtml(line)
    : creditPieces(line)
        .map((part) => {
          if (typeof part === "string") return escapeHtml(part);
          const href = safeHref(part.href);
          return href === null ? escapeHtml(part.text) : `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(part.text)}</a>`;
        })
        .join("");

/** Where the links go and how the header is made. */
export interface PageHeaderOptions {
  /** The demo's home page, as an address the page can use. Default `index.html`. */
  home?: string;
  /** The printable sheets, when the package has them. Left out, the header has no Sheets link. */
  sheets?: string;
  /** The language of the words written inside the tag. Default `en`; the element changes it with the reader's. */
  language?: Language;
  /** Also set the document's title and description from these words when the language changes (the element's `meta` attribute). */
  meta?: boolean;
  /** Your own words for Home and the sheets link, over the family's. */
  words?: Partial<PageFrameWords>;
}

const attribute = (name: string, value: string | undefined): string => (value === undefined || value === "" ? "" : ` ${name}="${escapeHtml(value)}"`);

/**
 * `<kazoku-page-header>` as a string, for a build: the package's name, what this page shows, the page's description (kept for `meta`), and the links, with the same words
 * inside as the no-script fallback. Needs no DOM.
 *
 * @example
 * pageHeaderHtml(
 *   { en: { name: "Hoshi Stars", what: "The 88 constellations", description: "…" }, ja: { name: "星 Hoshi Stars", what: "88の星座", description: "…" } },
 *   { sheets: "kids.html" },
 * );
 */
export function pageHeaderHtml(texts: PageTexts, options: PageHeaderOptions = {}): string {
  const language = options.language ?? "en";
  const home = options.home ?? "index.html";
  const words = wordsFor(language, options.words);
  const text = pickText(texts, language);
  const attrs =
    attribute("name", texts.en.name) + attribute("what", texts.en.what) + attribute("description", texts.en.description) +
    (texts.ja === undefined ? "" : attribute("name-ja", texts.ja.name) + attribute("what-ja", texts.ja.what) + attribute("description-ja", texts.ja.description)) +
    attribute("home", home) + attribute("sheets", options.sheets) + (options.meta === true ? " meta" : "");
  const links = `<a href="${escapeHtml(home)}">${escapeHtml(words.home)}</a>${options.sheets === undefined ? "" : ` <a href="${escapeHtml(options.sheets)}">${escapeHtml(words.sheets)}</a>`}`;
  return `<kazoku-page-header${attrs}><p><strong>${escapeHtml(text.name)}</strong>${escapeHtml(words.colon)}${escapeHtml(text.what)}</p><p>${links}</p></kazoku-page-header>`;
}

/** How the credit line is made. */
export interface PageCreditsOptions {
  /** A link to the NOTICE or credits page ("Data and credits"). With a line of credits too, the link follows it. */
  href?: string;
  /** The small form for a page that sits inside someone else's site: the credit line only. */
  embed?: boolean;
  /** The language of the words written inside the tag. Default `en`. */
  language?: Language;
  /** Your own words, over the family's. */
  words?: Partial<PageFrameWords>;
}

/**
 * `<kazoku-page-credits>` as a string, for a build. Give the page's own credit line, or a `href` to a credits page, or both. A line given
 * in pieces keeps its links: the `credit-parts` attributes carry them for the element, and the text inside has them too.
 *
 * @example
 * pageCreditsHtml({ en: "Stars: Yale Bright Star Catalogue (public domain).", ja: "星：イェール輝星星表（パブリックドメイン）。" }, { href: "NOTICE.html" });
 * pageCreditsHtml({ en: ["Flag: ", { text: "CC BY 2.5", href: "https://creativecommons.org/licenses/by/2.5/" }] }, { embed: true });
 */
export function pageCreditsHtml(credits: PageCredits | undefined, options: PageCreditsOptions = {}): string {
  const language = options.language ?? "en";
  const words = wordsFor(language, options.words);
  const line = credits === undefined ? "" : (credits[language] ?? credits.en);
  const pieces = (value: string | readonly CreditPart[] | undefined): string | undefined => (value === undefined || typeof value === "string" ? undefined : JSON.stringify(creditPieces(value)));
  const attrs =
    (credits === undefined
      ? ""
      : attribute("credits", plain(credits.en)) + attribute("credits-ja", plain(credits.ja)) + attribute("credit-parts", pieces(credits.en)) + attribute("credit-parts-ja", pieces(credits.ja))) +
    attribute("href", options.href) +
    (options.embed === true ? " embed" : "");
  const link = options.href === undefined ? "" : ` <a href="${escapeHtml(options.href)}">${escapeHtml(words.credits)}</a>`;
  return `<kazoku-page-credits${attrs}><p>${lineHtml(line)}${link}</p></kazoku-page-credits>`;
}

/** How the footer is made. */
export interface PageFooterOptions {
  /** `view` (the default): one quiet line; `page`: the reading page's footer. */
  variant?: "view" | "page";
  /** The page of data and credits. */
  href?: string;
  /** The package's name, for "Drawn with …", and where it links. */
  package?: string;
  packageHref?: string;
  /** How to cite, and the sheets to print. Left out, there is no link. */
  citeHref?: string;
  sheetsHref?: string;
  /** A link home; `index.html` by default. */
  home?: string;
  /** The language of the words written inside the tag. Default `en`. */
  language?: Language;
  /** Your own words, over the family's. */
  words?: Partial<PageFrameWords>;
}

/**
 * `<kazoku-page-footer>` as a string, for a build: the links, with the same words inside as the no-script fallback.
 *
 * @example
 * pageFooterHtml({ variant: "page", package: "Hoshi Stars", href: "credits.html", citeHref: "cite.html", sheetsHref: "sheets.html" });
 */
export function pageFooterHtml(options: PageFooterOptions = {}): string {
  const language = options.language ?? "en";
  const words = wordsFor(language, options.words);
  const home = options.home ?? "index.html";
  const link = (to: string | undefined, text: string): string => (to === undefined || to === "" ? "" : `<a href="${escapeHtml(to)}">${escapeHtml(text)}</a>`);
  const attrs = attribute("variant", options.variant === "page" ? "page" : undefined) + attribute("href", options.href) + attribute("package", options.package) + attribute("package-href", options.packageHref) + attribute("cite-href", options.citeHref) + attribute("sheets-href", options.sheetsHref) + attribute("home", home);
  if (options.variant !== "page") return `<kazoku-page-footer${attrs}><p>${escapeHtml(words.positions)}${options.href === undefined ? "" : ` · ${link(options.href, words.credits)}`}</p></kazoku-page-footer>`;
  const items = [
    options.package === undefined ? "" : `<li>${escapeHtml(words.drawnWith)} ${link(options.packageHref, options.package) || escapeHtml(options.package)}</li>`,
    options.href === undefined ? "" : `<li>${escapeHtml(words.sourcesLead)} ${link(options.href, words.credits)}</li>`,
    options.citeHref === undefined ? "" : `<li>${link(options.citeHref, words.cite)}</li>`,
    options.sheetsHref === undefined ? "" : `<li>${link(options.sheetsHref, words.sheetsToPrint)}</li>`,
    `<li>${link(home, words.home)}</li>`,
  ];
  return `<kazoku-page-footer${attrs}><footer><ul>${items.join("")}</ul></footer></kazoku-page-footer>`;
}
