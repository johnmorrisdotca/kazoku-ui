// <kazoku-segmented-switch>: part 6. A group of segments, one chosen, in a panel-coloured box with a 1 px border; the chosen one is filled `line` and `aria-pressed`.
// It is the language switch (EN, 日本語) and the sky culture switch (Western, Japanese, Chinese), and takes any other choices a page gives.
import { applyLanguage } from "../../language-picker/languages.ts";
import { h, setAttr, setText } from "../dom.ts";
import { InterfacePart } from "../part.ts";
import { cultureSegments, LANGUAGE_SEGMENTS, parseSegments, type Segment } from "../segments.ts";
import { PHONE, UI_BASE } from "../styles.ts";
import { kui, RADII } from "../tokens.ts";

export const SEGMENTED_SWITCH_TAG = "kazoku-segmented-switch";
export const SEGMENT_EVENT = "kazoku-segmentchange";

/** What `kazoku-segmentchange` carries in `detail`. */
export interface SegmentChangeDetail {
  /** The value now chosen. */
  value: string;
  /** The one before; `undefined` the first time. */
  previous: string | undefined;
  /** `user` (a press) or `set` (the `value` property or attribute). */
  reason: "user" | "set";
}

const STYLES = `${UI_BASE}
:host { display: inline-block; }
.group { display: inline-flex; align-items: stretch; gap: 0; padding: 2px; border: 1px solid ${kui("line")}; border-radius: var(--kui-radius-control, ${RADII.control}px); background: ${kui("panel")}; }
button { display: inline-flex; align-items: center; justify-content: center; min-width: 44px; height: 40px; padding: 0 12px; border: 0; border-radius: calc(var(--kui-radius-control, ${RADII.control}px) - 2px); background: transparent; color: ${kui("text-quiet")}; font-size: 13px; font-weight: 500; white-space: nowrap; }
button:hover:not([aria-pressed="true"]) { color: ${kui("text")}; }
button[aria-pressed="true"] { background: ${kui("line")}; color: ${kui("text")}; font-weight: 600; }
${PHONE} { button { height: 44px; padding: 0 10px; } }
@media (forced-colors: active) { button[aria-pressed="true"] { background: Highlight; color: HighlightText; } }
`;

/**
 * Attributes: `kind` (`language`: EN and 日本語, which also writes the choice as `lang` on the page's <html> unless `no-apply` is there; `culture`: Western, Japanese, Chinese; or leave it off and give
 * `options`), `options` (`western:Western|japanese:Japanese`; the `options` property takes `{ value, label }` objects), `value` (the one chosen; the language switch takes the page's `lang` instead), `label` (the group's name for a screen reader), `lang`, `no-apply`.
 * Each segment is a `<button>` with `aria-pressed`. 40 px tall on a desk, 44 on a phone. The page hears `kazoku-segmentchange` with `{ value, previous, reason }`.
 * Parts: `group`, `segment`.
 *
 * @example
 * <kazoku-segmented-switch kind="culture" value="western"></kazoku-segmented-switch>
 */
export class SegmentedSwitchElement extends InterfacePart {
  static observedAttributes = ["kind", "options", "value", "label", "lang"];

  #group!: HTMLElement;
  #options: readonly Segment[] | undefined;
  #value: string | undefined;
  #shown = "";

  /** The value chosen now; for the language switch, it follows the page's own `lang`. */
  get value(): string {
    return this.#value ?? this.#segments()[0]?.value ?? "";
  }

  set value(next: string) {
    this.#choose(next, "set");
  }

  /** The segments, when the page gives them as objects over the `options` attribute. */
  get options(): readonly Segment[] {
    return this.#segments();
  }

  set options(list: readonly Segment[]) {
    this.#options = list;
    if (this.ready) this.refresh();
  }

  protected styles(): string {
    return STYLES;
  }

  protected build(): void {
    this.#group = h(this.ownerDocument, "div", { class: "group", role: "group", part: "group" });
    this.#group.addEventListener("click", (event) => {
      const segment = (event.target as Element).closest<HTMLButtonElement>("button[data-v]");
      if (segment !== null) this.#choose(segment.dataset["v"] as string, "user");
    });
    this.root.append(this.#group);
  }

  #segments(): readonly Segment[] {
    if (this.#options !== undefined) return this.#options;
    const kind = this.getAttribute("kind");
    if (kind === "language") return LANGUAGE_SEGMENTS;
    if (kind === "culture") return cultureSegments(this.words);
    return parseSegments(this.getAttribute("options"));
  }

  #choose(next: string, reason: "user" | "set"): void {
    if (!this.#segments().some((segment) => segment.value === next) || next === this.#value) return;
    const previous = this.#value;
    this.#value = next;
    if (this.getAttribute("value") !== next) {
      // The attribute follows the choice, as the family's other parts do.
      this.setAttribute("value", next);
    }
    if (this.getAttribute("kind") === "language" && !this.hasAttribute("no-apply") && reason === "user") applyLanguage(this.ownerDocument.documentElement, next);
    if (this.ready) this.paint();
    this.emit<SegmentChangeDetail>(SEGMENT_EVENT, { value: next, previous, reason });
  }

  protected paint(): void {
    const kind = this.getAttribute("kind");
    const segments = this.#segments();
    // The language switch shows the page's own language; the others take `value`, else the first segment.
    if (kind === "language" && !this.hasAttribute("no-apply")) this.#value = segments.find((segment) => segment.value === this.language)?.value ?? this.#value;
    else {
      const asked = this.getAttribute("value");
      if (asked !== null && segments.some((segment) => segment.value === asked)) this.#value = asked;
    }
    this.#value ??= segments[0]?.value;
    const name = this.getAttribute("label") ?? (kind === "language" ? this.words.languageGroup : kind === "culture" ? this.words.cultureGroup : "");
    setAttr(this.#group, "aria-label", name === "" ? null : name);
    const shape = segments.map((segment) => segment.value).join("|");
    if (shape !== this.#shown) {
      this.#group.replaceChildren(...segments.map((segment) => h(this.ownerDocument, "button", { type: "button", part: "segment", "data-v": segment.value, ...(kind === "language" ? { lang: segment.value } : {}) })));
      this.#shown = shape;
    }
    segments.forEach((segment, at) => {
      const button = this.#group.children[at] as HTMLButtonElement;
      setText(button, segment.label);
      setAttr(button, "aria-pressed", String(segment.value === this.#value));
    });
  }
}
