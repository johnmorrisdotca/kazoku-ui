// <kazoku-reading-page>: part 10. An object's own page, one layout for every kind. At most 1,120 px wide. In order: the picture beside the kind, the name, one sentence and the buttons; "Right now" as a row of
// three tiles; "The numbers" as a table (measure, value, a comparison with its source); related objects as link tiles; and the footer, which the page puts in the `footer` slot. On a phone it is one column and the table keeps two.
import { formatValue, say, type SourceLink } from "../card.ts";
import { h, setAttr, valueNodes } from "../dom.ts";
import { InterfacePart } from "../part.ts";
import { type ReadingPageData } from "../reading.ts";
import { trailText } from "../trail.ts";
import { MONO, PHONE, UI_BASE } from "../styles.ts";
import { kui, RADII, SIZES } from "../tokens.ts";
import { defineBasics } from "./basics.ts";

export const READING_PAGE_TAG = "kazoku-reading-page";

const STYLES = `${UI_BASE}
:host { display: block; min-height: 100%; background: ${kui("page")}; color: ${kui("text")}; }
.wrap { max-width: ${SIZES.page}px; margin: 0 auto; padding: 32px 24px 24px; }
.hero { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 6fr); gap: 40px; align-items: center; }
.pic { display: flex; justify-content: center; }
.pic img { display: block; width: 100%; max-width: 340px; height: auto; aspect-ratio: 1; object-fit: contain; border-radius: 50%; }
.crumbs { margin: 0 0 14px; padding: 0; list-style: none; display: flex; flex-wrap: wrap; gap: 4px; color: ${kui("text-quiet")}; font-size: 13px; }
.crumbs li + li::before { content: "/"; margin-right: 4px; }
.crumbs a { color: ${kui("text-quiet")}; display: inline-flex; align-items: center; min-height: 24px; }
h1 { margin: 6px 0 14px; font-size: ${SIZES.nameDesk}px; font-weight: 600; line-height: 1.08; overflow-wrap: anywhere; }
h1 .ja { margin-left: 0.3em; color: ${kui("text-quiet")}; font-size: ${Math.round((SIZES.nameDesk * 2) / 3)}px; font-weight: 400; white-space: nowrap; }
.summary { margin: 0 0 22px; color: ${kui("text-soft")}; font-size: 18px; line-height: 1.55; }
.actions { display: flex; flex-wrap: wrap; gap: 10px; }
section { margin-top: 44px; }
h2 { margin: 0 0 16px; color: ${kui("text")}; font-size: 24px; font-weight: 600; line-height: 1.25; }
.tiles { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin: 0; padding: 0; list-style: none; }
.tile { padding: 16px 18px; }
.tile .label { margin-bottom: 6px; }
.tile .note { margin: 8px 0 0; color: ${kui("text-quiet")}; font-size: 13px; }
.tile .go { display: inline-flex; align-items: center; min-height: 44px; margin-top: 4px; font-size: 14px; }
.tap { display: none; margin: 14px 0 0; color: ${kui("text-quiet")}; font-size: 13px; }
.big { font-family: ${MONO}; font-size: 24px; font-weight: 500; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.big a { color: ${kui("text")}; text-decoration: none; border-bottom: 1px dotted ${kui("text-quiet")}; }
.big a:hover { color: ${kui("sky-hover")}; }
.num { white-space: nowrap; }
.big sup, td.v sup { font-size: 0.7em; line-height: 0; vertical-align: super; }
.unit { color: ${kui("text-quiet")}; font-size: 14px; font-weight: 400; }
table { width: 100%; border-collapse: collapse; font-size: 15px; }
th, td { padding: 12px 14px 12px 0; border-bottom: 1px solid ${kui("line")}; text-align: left; vertical-align: top; }
thead th { color: ${kui("text-quiet")}; font-size: 11px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; }
tbody th { color: ${kui("text-soft")}; font-weight: 400; }
td.v { font-family: ${MONO}; font-variant-numeric: tabular-nums; white-space: nowrap; }
td.v a { color: ${kui("text")}; text-decoration: underline dotted ${kui("text-quiet")}; text-underline-offset: 4px; }
td.c { color: ${kui("text-soft")}; }
td.c a { margin-left: 0.5em; font-size: 13px; }
.related { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; margin: 0; padding: 0; list-style: none; }
.related a { display: flex; flex-direction: row; align-items: center; gap: 14px; min-height: 64px; padding: 10px 16px; border: 1px solid ${kui("line")}; border-radius: var(--kui-radius-panel, ${RADII.panel}px); background: ${kui("panel")}; color: ${kui("text")}; font-weight: 600; text-decoration: none; }
.related a:hover { border-color: ${kui("line-strong")}; color: ${kui("sky-hover")}; }
.related .ja { color: ${kui("text-quiet")}; font-weight: 400; }
.related .t { display: flex; flex-direction: column; min-width: 0; }
.related .mono { color: ${kui("text-quiet")}; font-size: 12px; font-weight: 400; }
.related img { width: 48px; height: 48px; flex: none; border-radius: 50%; object-fit: cover; }
::slotted([slot="footer"]) { display: block; max-width: ${SIZES.page}px; margin: 56px auto 0; padding: 0 24px; }
${PHONE} {
  .wrap { padding: 20px 16px 16px; }
  ::slotted([slot="footer"]) { padding: 0 16px; }
  .hero { grid-template-columns: minmax(0, 1fr); gap: 20px; }
  h1 { font-size: ${SIZES.namePhone}px; }
  h1 .ja { font-size: ${Math.round((SIZES.namePhone * 2) / 3)}px; }
  .summary { font-size: 16px; }
  .tiles { grid-template-columns: minmax(0, 1fr); gap: 8px; }
  .tile { padding: 14px 16px; }
  .big { font-size: 20px; }
  .tap { display: block; }
  h2 { font-size: 22px; }
  .pic img { max-width: 210px; }
  section { margin-top: 32px; }
  .c, th.c { display: none; }
  td.v { text-align: right; }
}
`;

/**
 * Give it its data in the `data` property (a `ReadingPageData`) and put the page footer in the `footer` slot. `readingProblems(data)` says what is wrong with a page before it is shown.
 * Attributes: `lang`. Parts: `hero`, `breadcrumb`, `picture`, `name`, `summary`, `actions`, `now`, `numbers`, `related`.
 *
 * @example
 * <kazoku-reading-page id="page"><kazoku-page-footer slot="footer" variant="page" href="credits.html"></kazoku-page-footer></kazoku-reading-page>
 */
export class ReadingPageElement extends InterfacePart {
  static observedAttributes = ["lang"];

  #data: ReadingPageData | undefined;
  #wrap!: HTMLElement;

  /** What the page shows. */
  get data(): ReadingPageData | undefined {
    return this.#data;
  }

  set data(next: ReadingPageData | undefined) {
    this.#data = next;
    if (this.ready) this.paint();
  }

  protected styles(): string {
    return STYLES;
  }

  protected build(): void {
    defineBasics();
    this.#wrap = h(this.ownerDocument, "main", { class: "wrap" });
    this.root.append(this.#wrap, h(this.ownerDocument, "slot", { name: "footer" }));
  }

  #value(doc: Document, value: string | number | null | undefined, unit: string | undefined, source: SourceLink | undefined, language: "en" | "ja", label: string): HTMLElement {
    const text = formatValue(value);
    const where = source === undefined ? "" : say(source.label, language);
    const content: (string | Node)[] = [h(doc, "span", { class: "num" }, valueNodes(doc, value))];
    if (unit !== undefined && unit !== "") content.push(" ", h(doc, "span", { class: "unit" }, [unit]));
    return source === undefined
      ? h(doc, "span", {}, content)
      : h(doc, "a", { href: source.href, "aria-label": `${label}: ${text}${unit ? ` ${unit}` : ""}. ${this.words.source}: ${where}`, title: `${this.words.source}: ${where}` }, content);
  }

  protected paint(): void {
    const data = this.#data;
    if (data === undefined) {
      this.#wrap.replaceChildren();
      return;
    }
    const doc = this.ownerDocument;
    const { language, words } = this;
    const both = data.name.ja !== "" && data.name.ja !== data.name.en;
    const heading = h(doc, "h1", { part: "name" }, [h(doc, "span", { lang: "en" }, [data.name.en]), both && h(doc, "span", { class: "ja", lang: "ja" }, [data.name.ja])]);
    const buttons = data.actions.map((action, at) => h(doc, "kazoku-button", { href: action.href, ...(at === 0 ? { variant: "filled" } : {}), lang: language }, [say(action.label, language)]));
    const trail = data.breadcrumb ?? [];
    const crumbs = trail.length === 0 ? null : h(doc, "nav", { "aria-label": words.trail }, [h(doc, "ol", { class: "crumbs", part: "breadcrumb" }, trail.map((item, at) => {
      const last = at === trail.length - 1;
      return h(doc, "li", {}, [item.href !== undefined && !last ? h(doc, "a", { href: item.href }, [trailText([item])]) : h(doc, "span", last ? { "aria-current": "page" } : {}, [trailText([item])])]);
    }))]);
    const hero = h(doc, "div", { class: "hero", part: "hero" }, [
      data.picture !== undefined && h(doc, "div", { class: "pic", part: "picture" }, [h(doc, "img", { src: data.picture.src, alt: say(data.picture.alt, language), loading: "eager", decoding: "async" })]),
      h(doc, "div", {}, [crumbs, h(doc, "p", { class: "label" }, [say(data.kind, language)]), heading, h(doc, "p", { class: "summary", part: "summary" }, [say(data.summary, language)]), h(doc, "div", { class: "actions", part: "actions" }, buttons)]),
    ]);
    const now = h(doc, "section", { "aria-labelledby": "now", part: "now" }, [
      h(doc, "h2", { id: "now" }, [words.rightNow]),
      h(doc, "ul", { class: "tiles" }, data.now.map((tile) => h(doc, "li", { class: "tile panel" }, [
        h(doc, "p", { class: "label" }, [say(tile.label, language)]),
        h(doc, "p", { class: "big" }, [this.#value(doc, tile.value, tile.unit, tile.source, language, say(tile.label, language))]),
        tile.note !== undefined && h(doc, "p", { class: "note" }, [say(tile.note, language)]),
        tile.link !== undefined && h(doc, "a", { class: "go", href: tile.link.href }, [say(tile.link.label, language)]),
      ]))),
    ]);
    const table = h(doc, "table", {}, [
      h(doc, "thead", {}, [h(doc, "tr", {}, [h(doc, "th", { scope: "col" }, [words.measure]), h(doc, "th", { scope: "col" }, [words.value]), h(doc, "th", { scope: "col", class: "c" }, [words.comparison])])]),
      h(doc, "tbody", {}, data.numbers.map((row) => {
        const label = say(row.label, language);
        return h(doc, "tr", {}, [
          h(doc, "th", { scope: "row" }, [label]),
          h(doc, "td", { class: "v" }, [this.#value(doc, row.value, row.unit, row.source, language, label)]),
          h(doc, "td", { class: "c" }, [row.comparison === undefined ? "" : `${say(row.comparison, language)} · `, row.source !== undefined && h(doc, "a", { href: row.source.href, "aria-label": `${label}: ${words.source}: ${say(row.source.label, language)}` }, [words.sourceWord])]),
        ]);
      })),
    ]);
    const numbers = h(doc, "section", { "aria-labelledby": "numbers", part: "numbers" }, [h(doc, "h2", { id: "numbers" }, [words.theNumbers]), table, h(doc, "p", { class: "tap" }, [words.tapNote])]);
    const groups = data.related.map((group, index) => h(doc, "section", { "aria-labelledby": `related-${index}`, part: "related" }, [
      h(doc, "h2", { id: `related-${index}` }, [say(group.title, language)]),
      h(doc, "ul", { class: "related" }, group.items.map((one) => h(doc, "li", {}, [h(doc, "a", { href: one.href }, [
        one.picture !== undefined && h(doc, "img", { src: one.picture, alt: "", loading: "lazy" }),
        h(doc, "span", { class: "t" }, [
          h(doc, "span", {}, [one.label.en, one.label.ja !== "" && one.label.ja !== one.label.en && h(doc, "span", { class: "ja", lang: "ja" }, [` ${one.label.ja}`])]),
          one.kind !== undefined && h(doc, "span", { class: "mono" }, [say(one.kind, language)]),
        ]),
      ])]))),
    ]));
    this.#wrap.replaceChildren(hero, now, numbers, ...groups);
    setAttr(this.#wrap, "lang", language);
  }
}
