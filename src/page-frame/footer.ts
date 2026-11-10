// <kazoku-page-footer>: the page frame's third part (the first two are the header and the credit line). On a view it is one quiet line at the bottom left, "Positions computed for the time shown · Data and credits".
// On a reading page it is the footer: "Drawn with <package>", "Sources for every number on this page: data and credits", "How to cite", "Sheets to print", and a link home.
// It reads from a package's `credits()` (the data door's shape), so the line names the sources the page really drew from. It draws nothing of the page.
import { adoptStyles } from "../shared/adopt.ts";
import { creditsText, type DoorCredit } from "../shared/door.ts";
import { followLanguage, languageFor } from "../shared/language.ts";
import { kui, SIZES } from "../interface/tokens.ts";
import { PHONE, UI_BASE } from "../interface/styles.ts";
import { FOOTER_TAG } from "./index.ts";
import { wordsFor, type PageFrameWords } from "./words.ts";

export { FOOTER_TAG };

const STYLES = `${UI_BASE}
:host { display: block; }
:host([variant="view"]), :host(:not([variant])) { position: fixed; left: 12px; bottom: 8px; z-index: 4; max-width: calc(100vw - 24px); }
:host([placement="absolute"]) { position: absolute; }
:host([placement="static"]) { position: relative; left: auto; bottom: auto; }
.line { margin: 0; color: ${kui("text-quiet")}; font-size: 12px; line-height: 1.4; }
.line a, .foot a { display: inline-flex; align-items: center; min-height: ${SIZES.touch}px; }
.line .sep { margin: 0 0.4em; }
.foot { padding: 28px 0 24px; border-top: 1px solid ${kui("line")}; color: ${kui("text-soft")}; font-size: 14px; }
.foot ul { display: flex; flex-wrap: wrap; gap: 0 24px; margin: 0; padding: 0; list-style: none; }
.foot li { display: flex; align-items: center; gap: 0.4em; min-height: ${SIZES.touch}px; }
.credits { margin: 8px 0 0; color: ${kui("text-quiet")}; font-size: 12px; line-height: 1.5; }
${PHONE} { :host([variant="view"]), :host(:not([variant])) { bottom: ${SIZES.controlBarPhone + 8}px; } :host([placement="static"]) { bottom: auto; } .foot ul { flex-direction: column; } }
`;

/** The attribute for a language: `what-ja` for Japanese when it is there, else `what`. */
const attributeIn = (element: HTMLElement, name: string, language: string): string => (language === "ja" ? element.getAttribute(`${name}-ja`) : null) ?? element.getAttribute(name) ?? "";

/**
 * Attributes: `variant` (`view`, the default: the quiet line of a view; or `page`: the reading page's footer), `note` and `note-ja` (the view line's first words, "Positions computed for the time shown" by default),
 * `href` (the page of data and credits), `package` (the name for "Drawn with …"), `package-href`, `cite-href` (how to cite), `sheets-href` (sheets to print), `home` (a link home; `index.html` by default), `home-label` (what it says; "Home" by default), `placement` (`fixed` at the
 * bottom left for a view, `absolute` or `static`), `lang`. The `sources` property takes a view's `credits()`; the footer shows what each source credits, with its licence, and "non-commercial" or "share-alike" when it says so.
 * Parts: `line`, `footer`, `credits`.
 *
 * @example
 * <kazoku-page-footer variant="page" package="Hoshi Stars" href="credits.html" cite-href="cite.html" sheets-href="sheets.html"></kazoku-page-footer>
 */
export class PageFooterElement extends HTMLElement {
  static observedAttributes = ["variant", "note", "note-ja", "href", "package", "package-href", "cite-href", "sheets-href", "home", "home-label", "lang"];

  #root: ShadowRoot;
  #words: Partial<PageFrameWords> = {};
  #sources: readonly DoorCredit[] = [];
  #stop: (() => void)[] = [];
  #styled = false;
  #ready = false;

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: "open" });
  }

  /** Your own words over the family's, for example `{ cite: "Cite this page" }`. */
  set words(words: Partial<PageFrameWords>) {
    this.#words = words;
    if (this.#ready) this.#render();
  }

  /** What the view drew from: its `credits()`. */
  get sources(): readonly DoorCredit[] {
    return this.#sources;
  }

  set sources(next: readonly DoorCredit[]) {
    this.#sources = next;
    if (this.#ready) this.#render();
  }

  connectedCallback(): void {
    if (!this.#styled) {
      adoptStyles(this.#root, STYLES, this.nonce);
      this.#styled = true;
    }
    this.#stop.push(followLanguage(this, () => this.#render()));
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
    const doc = this.ownerDocument;
    const language = languageFor(this);
    const words = wordsFor(language, this.#words);
    const href = this.getAttribute("href");
    const link = (to: string | null, text: string): HTMLAnchorElement | null => {
      if (to === null || to === "") return null;
      const a = doc.createElement("a");
      a.href = to;
      a.textContent = text;
      a.setAttribute("part", "link");
      return a;
    };
    const credits = creditsText(this.#sources, language, words);
    if (this.getAttribute("variant") !== "page") {
      const line = doc.createElement("p");
      line.className = "line";
      line.setAttribute("part", "line");
      line.setAttribute("lang", language);
      const note = attributeIn(this, "note", language) || words.positions;
      line.append(note);
      const credit = link(href, words.credits);
      if (credit !== null) {
        const sep = doc.createElement("span");
        sep.className = "sep";
        sep.setAttribute("aria-hidden", "true");
        sep.textContent = "·";
        line.append(sep, credit);
      }
      this.#show(line);
      return;
    }
    const foot = doc.createElement("footer");
    foot.className = "foot";
    foot.setAttribute("part", "footer");
    foot.setAttribute("lang", language);
    const items: Node[] = [];
    const add = (...nodes: (Node | string | null)[]): void => {
      const li = doc.createElement("li");
      li.append(...nodes.filter((node): node is Node | string => node !== null));
      items.push(li);
    };
    const pack = this.getAttribute("package");
    if (pack !== null && pack !== "") add(`${words.drawnWith} `, link(this.getAttribute("package-href"), pack) ?? pack);
    const sources = link(href, words.credits);
    if (sources !== null) add(`${words.sourcesLead} `, sources);
    const cite = link(this.getAttribute("cite-href"), words.cite);
    if (cite !== null) add(cite);
    const sheets = link(this.getAttribute("sheets-href"), words.sheetsToPrint);
    if (sheets !== null) add(sheets);
    add(link(this.getAttribute("home") ?? "index.html", this.getAttribute("home-label") || words.home));
    const list = doc.createElement("ul");
    list.append(...items);
    foot.append(list);
    if (credits !== "") {
      const text = doc.createElement("p");
      text.className = "credits";
      text.setAttribute("part", "credits");
      text.textContent = credits;
      foot.append(text);
    }
    this.#show(foot);
  }

  /** Puts `node` in the shadow root as its only content, leaving the `<style>` an old browser's fallback wrote. */
  #show(node: Node): void {
    for (const child of [...this.#root.children]) if (child.localName !== "style") child.remove();
    this.#root.append(node);
  }
}
