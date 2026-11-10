// The base of every interface element: a shadow root with the styles adopted (a strict Content-Security-Policy allows it), the words in the page's language kept up as it changes,
// a `words` property to cover any of them, and one `kazoku-*` event helper. A part builds its tree once in `build` and patches it in `paint`, so a repaint never costs the reader their focus.
import { adoptStyles } from "../shared/adopt.ts";
import { followLanguage, languageFor, type Language } from "../shared/language.ts";
import { wordsFor, type InterfaceWords } from "./words.ts";

export abstract class InterfacePart extends HTMLElement {
  protected readonly root: ShadowRoot;
  protected ready = false;
  protected words: InterfaceWords = wordsFor("en");
  protected language: Language = "en";
  #own: Partial<InterfaceWords> = {};
  #stops: (() => void)[] = [];
  #styled = false;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
  }

  /** The CSS of the part. */
  protected abstract styles(): string;
  /** Builds the tree, once, when the part first connects. */
  protected abstract build(): void;
  /** Brings the tree in line with the attributes, the properties, the language and the words; called again on every change. */
  protected abstract paint(): void;
  /** Called after the first paint, for listeners a part needs while it is connected; returns what stops them. */
  protected listen(): (() => void)[] {
    return [];
  }

  /** Your own words over the language's, for example `{ close: "Dismiss" }`. */
  set labels(own: Partial<InterfaceWords>) {
    this.#own = own;
    if (this.ready) this.refresh();
  }

  connectedCallback(): void {
    if (!this.#styled) {
      const outer = this.getRootNode();
      adoptStyles(this.root, this.styles(), this.nonce || (outer instanceof ShadowRoot ? (outer.host as HTMLElement).nonce : "") || "");
      this.build();
      this.#styled = true;
    }
    this.#stops.push(followLanguage(this, () => this.refresh()), ...this.listen());
    this.ready = true;
    this.refresh();
  }

  disconnectedCallback(): void {
    for (const stop of this.#stops.splice(0)) stop();
    this.ready = false;
  }

  attributeChangedCallback(): void {
    if (this.ready) this.refresh();
  }

  /** Reads the language and the words again, then paints. */
  protected refresh(): void {
    this.language = languageFor(this);
    this.words = wordsFor(this.language, this.#own);
    this.paint();
  }

  /** Says something happened: a bubbling, composed `CustomEvent` with the part's own name. */
  protected emit<T>(name: string, detail: T): boolean {
    return this.dispatchEvent(new CustomEvent<T>(name, { detail, bubbles: true, composed: true }));
  }
}
