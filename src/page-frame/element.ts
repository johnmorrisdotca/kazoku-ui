// <kazoku-page-header> and <kazoku-page-credits>: the two things every demo page shows without a menu. The header is one line (the package's name, what this page shows) with a Home
// link and, when the package has them, a Sheets link; it sits inside the page's own top bar and is not a bar of its own. The credit line is this page's data credits, or one link
// to them, above the family footer. An embed form of the credit line is the credit only, small. They read the page's `lang` (the language picker writes it on <html>) and say their
// words again when it changes. They draw nothing of the page.
import { type CreditPart, creditNodes, creditText, parseCreditParts } from "../shared/credit-parts.ts";
import { adoptStyles } from "../shared/adopt.ts";
import { watchScheme } from "../shared/scheme.ts";
import { samePage } from "./link.ts";
import { applyPageMeta } from "./meta.ts";
import { CREDITS_TAG, TAG } from "./index.ts";
import { CREDITS_STYLES, HEADER_STYLES } from "./styles.ts";
import { type PageText, type PageTexts } from "./text.ts";
import { languageOf, type Language, type PageFrameWords, wordsFor } from "./words.ts";

export { CREDITS_TAG, TAG };
export { FOOTER_TAG, PageFooterElement } from "./footer.ts";

/** The reader's language for an element: its own `lang`, else the nearest ancestor's, else the page's. */
function languageFor(element: HTMLElement): Language {
  return languageOf(element.getAttribute("lang") ?? element.closest("[lang]")?.getAttribute("lang") ?? element.ownerDocument.documentElement.lang);
}

/** The attribute for a language: `what-ja` for Japanese when it is there, else `what`. */
function attributeIn(element: HTMLElement, name: string, language: Language): string {
  return (language === "ja" ? element.getAttribute(`${name}-ja`) : null) ?? element.getAttribute(name) ?? "";
}

/** Keeps an element saying its words in the page's language: watches <html lang> and the element's own `lang`, and calls `render`. */
function followLanguage(element: HTMLElement, render: () => void): () => void {
  const observer = new MutationObserver(render);
  observer.observe(element.ownerDocument.documentElement, { attributes: true, attributeFilter: ["lang"] });
  return () => observer.disconnect();
}

/**
 * Attributes: `name` (the package's name), `what` (what this page shows, in plain words), `home` (the demo's home page; `index.html` by default), `sheets` (the printable sheets; no
 * Sheets link without it), `description` (the page's description) and `meta` (also set the document's `<title>` and description from these words, in the reader's language, each time
 * it changes), and `lang`. `name`, `what` and `description` each have a Japanese twin with `-ja` (`what-ja`); a language without one gets the English. The `texts` property takes the same
 * words as one table (`{ en: { name, what, description }, ja: { … } }`), the table `pageHeadHtml` writes the `<title>` from. Home on the home page is marked as the current page.
 * What is written inside the tag shows until the script loads, and without script. Parts: `bar`, `line`, `link`.
 */
export class PageHeaderElement extends HTMLElement {
  static observedAttributes = ["name", "name-ja", "what", "what-ja", "description", "description-ja", "home", "sheets", "meta", "lang"];

  #root: ShadowRoot;
  #texts: PageTexts | undefined;
  #words: Partial<PageFrameWords> = {};
  #stop: (() => void)[] = [];
  #styled = false;
  #ready = false;

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: "open" });
  }

  /** The page's words as one table, over the attributes. */
  get texts(): PageTexts | undefined {
    return this.#texts;
  }

  set texts(texts: PageTexts | undefined) {
    this.#texts = texts;
    if (this.#ready) this.#render();
  }

  /** Your own words for Home and the sheets link over the family's, for example `{ sheets: "Sheets to print" }`. */
  set words(words: Partial<PageFrameWords>) {
    this.#words = words;
    if (this.#ready) this.#render();
  }

  connectedCallback(): void {
    if (!this.#styled) {
      adoptStyles(this.#root, HEADER_STYLES, this.nonce);
      this.#styled = true;
    }
    this.#stop.push(watchScheme(this), followLanguage(this, () => this.#render()));
    this.#ready = true;
    this.#render();
  }

  disconnectedCallback(): void {
    for (const stop of this.#stop.splice(0)) stop();
    this.#ready = false;
  }

  attributeChangedCallback(): void {
    if (this.#ready) this.#render();
  }

  #textFor(language: Language): PageText {
    if (this.#texts !== undefined) return this.#texts[language] ?? this.#texts.en;
    return { name: attributeIn(this, "name", language), what: attributeIn(this, "what", language), description: attributeIn(this, "description", language) };
  }

  #render(): void {
    const language = languageFor(this);
    const words = wordsFor(language, this.#words);
    const text = this.#textFor(language);
    let bar = this.#root.querySelector<HTMLElement>(".bar");
    if (bar === null) {
      bar = this.ownerDocument.createElement("div");
      bar.className = "bar";
      bar.setAttribute("part", "bar");
      this.#root.append(bar);
    }
    bar.setAttribute("lang", language);
    const line = this.ownerDocument.createElement("p");
    line.className = "line";
    line.setAttribute("part", "line");
    const name = this.ownerDocument.createElement("strong");
    name.className = "name";
    name.textContent = text.name;
    line.append(name, words.colon, text.what);
    const nav = this.ownerDocument.createElement("nav");
    nav.setAttribute("aria-label", words.site);
    const here = this.ownerDocument.location?.href ?? "";
    const link = (href: string, label: string): void => {
      const a = this.ownerDocument.createElement("a");
      a.href = href;
      a.textContent = label;
      a.setAttribute("part", "link");
      if (samePage(href, here)) a.setAttribute("aria-current", "page");
      nav.append(a);
    };
    link(this.getAttribute("home") || "index.html", words.home);
    const sheets = this.getAttribute("sheets");
    if (sheets) link(sheets, words.sheets);
    bar.replaceChildren(line, nav);
    if (this.hasAttribute("meta")) {
      const texts: PageTexts = this.#texts ?? { en: this.#textFor("en"), ja: this.#textFor("ja") };
      applyPageMeta(this.ownerDocument, texts, language);
    }
  }
}

/**
 * Attributes: `credits` (this page's credit line, for example "Stars: Yale Bright Star Catalogue, public domain"), `credits-ja`, `credit-parts` and `credit-parts-ja` (the line in
 * pieces, as JSON: `["Flag: ", { "text": "CC BY 2.5", "href": "https://creativecommons.org/licenses/by/2.5/" }]`, so a licence and its source can each be a link; only an http,
 * https or relative address links), `href` (a link to the NOTICE or credits page,
 * labelled "Data and credits"; with a line of credits, the link follows it), `embed` (the small form for a page that sits in someone else's: the credit line only) and `lang`. A line of credits
 * alone is led by "Data and credits:". It is shown always, never in a fold. What is written inside the tag shows until the script loads, and without script. Parts: `box`, `text`, `link`,
 * `credit-link` (a piece's link, which opens in a tab of its own).
 */
export class PageCreditsElement extends HTMLElement {
  static observedAttributes = ["credits", "credits-ja", "credit-parts", "credit-parts-ja", "href", "embed", "lang"];

  #root: ShadowRoot;
  #words: Partial<PageFrameWords> = {};
  #pieces: Partial<Record<Language, readonly CreditPart[]>> | null = null;
  #stop: (() => void)[] = [];
  #styled = false;
  #ready = false;

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: "open" });
  }

  /** Your own words over the family's, for example `{ credits: "Sources" }`. */
  set words(words: Partial<PageFrameWords>) {
    this.#words = words;
    if (this.#ready) this.#render();
  }

  /**
   * The credit line in pieces, over the `credits` attributes: one list for every language, or one for each
   * (`{ en: [...], ja: [...] }`). A piece is a text or `{ text, href }`; only an http, https or relative address links.
   *
   * @example
   * ```ts
   * document.querySelector("kazoku-page-credits")!.credits = {
   *   en: ["Flag: ", { text: "CC BY 2.5", href: "https://creativecommons.org/licenses/by/2.5/" }],
   *   ja: ["旗：", { text: "CC BY 2.5", href: "https://creativecommons.org/licenses/by/2.5/" }],
   * };
   * ```
   */
  set credits(pieces: readonly CreditPart[] | Partial<Record<Language, readonly CreditPart[]>> | null) {
    this.#pieces = pieces === null ? null : Array.isArray(pieces) ? { en: pieces as readonly CreditPart[] } : (pieces as Partial<Record<Language, readonly CreditPart[]>>);
    if (this.#ready) this.#render();
  }

  connectedCallback(): void {
    if (!this.#styled) {
      adoptStyles(this.#root, CREDITS_STYLES, this.nonce);
      this.#styled = true;
    }
    this.#stop.push(watchScheme(this), followLanguage(this, () => this.#render()));
    this.#ready = true;
    this.#render();
  }

  disconnectedCallback(): void {
    for (const stop of this.#stop.splice(0)) stop();
    this.#ready = false;
  }

  attributeChangedCallback(): void {
    if (this.#ready) this.#render();
  }

  #render(): void {
    const language = languageFor(this);
    const words = wordsFor(language, this.#words);
    const pieces = this.#pieces?.[language] ?? this.#pieces?.en ?? parseCreditParts(attributeIn(this, "credit-parts", language) || null);
    const linked = pieces !== null && creditText(pieces).trim() !== "";
    const credits = linked ? creditText(pieces).trim() : attributeIn(this, "credits", language).trim();
    const href = this.getAttribute("href");
    let box = this.#root.querySelector<HTMLElement>(".box");
    if (box === null) {
      box = this.ownerDocument.createElement("section");
      box.className = "box";
      box.setAttribute("part", "box");
      this.#root.append(box);
    }
    box.setAttribute("lang", language);
    box.setAttribute("aria-label", words.credits);
    const parts: HTMLElement[] = [];
    if (credits !== "") {
      const text = this.ownerDocument.createElement("p");
      text.setAttribute("part", "text");
      if (!href) {
        const lead = this.ownerDocument.createElement("strong");
        lead.className = "lead";
        lead.textContent = `${words.credits}${words.colon}`;
        text.append(lead);
      }
      if (linked) text.append(...creditNodes(this.ownerDocument, pieces, { part: "credit-link" }));
      else text.append(credits);
      parts.push(text);
    }
    if (href) {
      const a = this.ownerDocument.createElement("a");
      a.href = href;
      a.textContent = words.credits;
      a.setAttribute("part", "link");
      // in someone else's frame the credits page opens in a tab of its own: the site it lives on may refuse to be framed, and the view would go blank
      if (this.hasAttribute("embed")) {
        a.target = "_blank";
        a.rel = "noopener";
      }
      parts.push(a);
    }
    box.replaceChildren(...parts);
    this.toggleAttribute("data-empty", parts.length === 0);
  }
}
