// <kazoku-object-card>: part 4. One layout for every kind of object. A label line with the kind, the name with its Japanese name beside it, a close button, a grid of numbers (a label over a mono value,
// each value a link to its source), the line that says so, then the filled button and the outlined one. On a desk a 320 px panel at the top right; on a phone a sheet that rises from above the control bar.
import { type ObjectCardData, formatValue, say } from "../card.ts";
import { h, setAttr } from "../dom.ts";
import { InterfacePart } from "../part.ts";
import { PHONE, PLACEMENT, UI_BASE } from "../styles.ts";
import { kui, RADII, SIZES } from "../tokens.ts";
import { defineBasics } from "./basics.ts";

export const OBJECT_CARD_TAG = "kazoku-object-card";
export const CARD_CLOSE_EVENT = "kazoku-cardclose";

const STYLES = `${UI_BASE}
:host { position: fixed; top: calc(var(--kui-top-offset, ${SIZES.topBar}px) + 16px); right: 16px; z-index: 6; display: block; width: ${SIZES.panel}px; max-width: calc(100vw - 32px); }
${PLACEMENT}
.card { position: relative; max-height: calc(100vh - ${SIZES.topBar + 32}px); overflow-y: auto; padding: 20px; }
.grab { display: none; }
.head { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 14px; }
.name { margin: 4px 0 0; font-size: ${SIZES.nameCard}px; font-weight: 600; line-height: 1.15; overflow-wrap: anywhere; }
.name .ja { margin-left: 0.4em; color: ${kui("text-quiet")}; font-size: ${Math.round((SIZES.nameCard * 2) / 3)}px; font-weight: 400; white-space: nowrap; }
.close { margin: -10px -10px 0 0; flex: none; }
.stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 16px; margin: 0 0 14px; }
.stat { min-width: 0; }
.stat dt { margin: 0 0 3px; }
.stat dd { margin: 0; font-family: var(--kui-font-mono, ui-monospace, monospace); font-size: 15px; font-weight: 500; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.stat dd a { color: ${kui("text")}; text-decoration: underline dotted ${kui("text-quiet")}; text-underline-offset: 4px; }
.stat dd a:hover { color: ${kui("sky-hover")}; text-decoration-style: solid; }
.unit { margin-left: 0.25em; color: ${kui("text-quiet")}; font-size: 12px; font-weight: 400; }
.note { margin: 0 0 16px; color: ${kui("text-quiet")}; font-size: 12px; }
.actions { display: flex; gap: 8px; }
.actions kazoku-button { flex: 1 1 0; min-width: 0; }
.actions kazoku-button[variant="filled"] { flex: 0 1 auto; min-width: 40%; }
.note a { color: ${kui("sky")}; }
${PHONE} {
  :host { top: auto; right: 0; bottom: ${SIZES.controlBarPhone}px; left: 0; width: auto; max-width: none; }
  :host([placement="absolute"]) { position: absolute; }
  :host([placement="static"]) { position: relative; }
  .card { max-height: calc(100vh - ${SIZES.controlBarPhone + SIZES.topBarPhone + 48}px); padding: 22px 16px 14px; border-radius: var(--kui-radius-sheet, ${RADII.sheet}px) var(--kui-radius-sheet, ${RADII.sheet}px) 0 0; border-bottom: 0; }
  .grab { position: absolute; top: 8px; left: 50%; display: block; width: 36px; height: 4px; margin-left: -18px; border-radius: 2px; background: ${kui("line-strong")}; }
  .head { margin-bottom: 10px; }
  .name { font-size: ${SIZES.nameCardPhone}px; }
  .name .ja { font-size: ${Math.round((SIZES.nameCardPhone * 2) / 3)}px; }
  .stats { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px 12px; }
  .stat dd { font-size: 14px; }
  .actions kazoku-button, .actions kazoku-button[variant="filled"] { flex: 1 1 0; }
}
`;

/**
 * Give it its data in the `data` property (an `ObjectCardData`: the kind, the name in English and Japanese, the numbers each with a source link, and the two buttons). Setting `data` shows the card.
 * A number that is computed live is never blank; `cardProblems(data)` says what is wrong with a card before it is shown. Closing it hides it and fires `kazoku-cardclose`.
 * Attributes: `placement` (`fixed` by default, `absolute` or `static`), `sources-href` (makes the word "source" in the note a link to the page of sources), `lang`. Parts: `card`, `kind`, `name`, `stats`, `stat`, `value`, `source-note`, `actions`.
 *
 * @example
 * card.data = { kind: { en: "Planet · gas giant", ja: "惑星・ガス惑星" }, name: { en: "Jupiter", ja: "木星" }, stats: [{ id: "radius", label: { en: "Radius", ja: "半径" }, value: 69911, unit: "km", source: { label: "NASA", href: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/jupiterfact.html" } }], primary: { label: { en: "Open page", ja: "ページを開く" }, href: "jupiter.html" } };
 */
export class ObjectCardElement extends InterfacePart {
  static observedAttributes = ["placement", "sources-href", "lang"];

  #data: ObjectCardData | undefined;
  #card!: HTMLElement;

  /** What the card shows. */
  get data(): ObjectCardData | undefined {
    return this.#data;
  }

  set data(next: ObjectCardData | undefined) {
    this.#data = next;
    if (next !== undefined) this.hidden = false;
    if (this.ready) this.paint();
  }

  /** Redraws the numbers that are computed for the time shown: call it after the clock moves, with the same `data` object changed in place. */
  refreshValues(): void {
    if (this.ready) this.paint();
  }

  protected styles(): string {
    return STYLES;
  }

  protected build(): void {
    defineBasics();
    this.#card = h(this.ownerDocument, "section", { class: "card panel float", part: "card" });
    this.root.append(this.#card);
  }

  protected paint(): void {
    const data = this.#data;
    this.toggleAttribute("data-empty", data === undefined);
    if (data === undefined) {
      this.#card.replaceChildren();
      return;
    }
    const doc = this.ownerDocument;
    const language = this.language;
    const { words } = this;
    const both = data.name.ja !== "" && data.name.ja !== data.name.en;
    setAttr(this.#card, "aria-label", `${words.card}: ${data.name.en}${both ? ` ${data.name.ja}` : ""}`);
    setAttr(this.#card, "role", "region");
    const close = h(doc, "kazoku-icon-button", { class: "close", icon: "close", lang: language });
    close.addEventListener("click", () => {
      this.hidden = true;
      this.emit(CARD_CLOSE_EVENT, {});
    });
    // Names appear side by side, English first and Japanese beside it, whichever language the page is in.
    const head = h(doc, "div", { class: "head" }, [
      h(doc, "div", {}, [
        h(doc, "p", { class: "label", part: "kind" }, [say(data.kind, language)]),
        h(doc, "h2", { class: "name", part: "name" }, [h(doc, "span", { lang: "en" }, [data.name.en]), both && h(doc, "span", { class: "ja", lang: "ja" }, [data.name.ja])]),
      ]),
      close,
    ]);
    const stats = h(doc, "dl", { class: "stats", part: "stats" });
    for (const stat of data.stats) {
      const text = formatValue(stat.value);
      const label = say(stat.label, language);
      const value = h(doc, "dd", { part: "value", "data-computed": stat.computed === true });
      const sourceText = stat.source === undefined ? "" : say(stat.source.label, language);
      const link = stat.source !== undefined ? h(doc, "a", { href: stat.source.href, "aria-label": `${label}: ${text}${stat.unit ? ` ${stat.unit}` : ""}. ${words.source}: ${sourceText}${stat.computed === true ? `. ${words.computed}` : ""}`, title: `${words.source}: ${sourceText}` }) : h(doc, "span", {});
      link.append(text);
      if (stat.unit !== undefined && stat.unit !== "") link.append(h(doc, "span", { class: "unit" }, [stat.unit]));
      value.append(link);
      stats.append(h(doc, "div", { class: "stat", part: "stat" }, [h(doc, "dt", { class: "label" }, [label]), value]));
    }
    const actions = h(doc, "div", { class: "actions", part: "actions" });
    if (data.primary !== undefined) actions.append(h(doc, "kazoku-button", { variant: "filled", href: data.primary.href }, [say(data.primary.label, language)]));
    if (data.secondary !== undefined) actions.append(h(doc, "kazoku-button", { href: data.secondary.href }, [say(data.secondary.label, language)]));
    this.#card.replaceChildren(h(doc, "div", { class: "grab", "aria-hidden": "true" }), head, stats, h(doc, "p", { class: "note", part: "source-note" }, [words.everyNumber, this.getAttribute("sources-href") ? h(doc, "a", { href: this.getAttribute("sources-href") ?? undefined }, [words.everyNumberLink]) : words.everyNumberLink, words.everyNumberTail]), actions);
  }
}
