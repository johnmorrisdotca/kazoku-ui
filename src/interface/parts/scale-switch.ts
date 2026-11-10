// <kazoku-scale-switch>: part 3. Surface, Moons, Solar system, Stars, Galaxy, always in that order. On a desk a vertical panel at the left edge (148 px wide, each step 44 px tall, the current one
// filled `line` with a 2 px `sun` mark on its left edge); on a phone a row of pills under the top bar that scrolls sideways (36 px pills, each a 44 px target, the current one with a `sun` border).
import { h, setAttr, setText } from "../dom.ts";
import { InterfacePart } from "../part.ts";
import { isScaleStep, parseScaleSteps, scaleName, type ScaleStep } from "../scale.ts";
import { PHONE, PLACEMENT, UI_BASE } from "../styles.ts";
import { kui, SIZES } from "../tokens.ts";

export const SCALE_SWITCH_TAG = "kazoku-scale-switch";
export const SCALE_EVENT = "kazoku-scalechange";

/** What `kazoku-scalechange` carries in `detail`. */
export interface ScaleChangeDetail {
  value: ScaleStep;
  previous: ScaleStep | undefined;
  /** `user` (a press) or `set` (the `value` property or attribute). */
  reason: "user" | "set";
}

const STYLES = `${UI_BASE}
:host { position: fixed; left: 16px; top: 50%; z-index: 5; transform: translateY(-50%); display: block; width: ${SIZES.scaleSwitch}px; }
${PLACEMENT}
.group { display: flex; flex-direction: column; padding: 4px 0; overflow: hidden; }
button { position: relative; display: flex; align-items: center; width: 100%; height: 44px; padding: 0 14px; border: 0; background: transparent; color: ${kui("text-quiet")}; font-size: 14px; font-weight: 500; text-align: left; }
button:hover:not([aria-pressed="true"]) { color: ${kui("text")}; }
button[aria-pressed="true"] { background: ${kui("line")}; color: ${kui("text")}; font-weight: 600; }
button[aria-pressed="true"]::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 2px; background: ${kui("sun")}; }
.pill { display: block; overflow: hidden; text-overflow: ellipsis; }
.title { margin: 0; padding: 14px 14px 4px; }
${PHONE} {
  :host { position: fixed; left: 0; right: 0; top: var(--kui-top-offset, ${SIZES.topBarPhone}px); width: auto; transform: none; }
  :host([placement="absolute"]) { position: absolute; }
  :host([placement="static"]) { position: relative; }
  .title { display: none; }
  .group { flex-direction: row; gap: 6px; padding: 4px 12px; overflow-x: auto; overscroll-behavior-x: contain; scrollbar-width: none; border: 0; background: transparent; box-shadow: none; border-radius: 0; }
  .group::-webkit-scrollbar { display: none; }
  button { flex: none; width: auto; height: 44px; padding: 0; background: transparent !important; }
  button::before { display: none; }
  .pill { display: inline-flex; align-items: center; height: 36px; padding: 0 16px; border: 1px solid ${kui("line")}; border-radius: 18px; background: ${kui("panel")}; white-space: nowrap; }
  button[aria-pressed="true"] .pill { border-color: ${kui("sun")}; }
}
@media (forced-colors: active) { button[aria-pressed="true"] { background: Highlight; color: HighlightText; } }
`;

/**
 * Attributes: `value` (the step now: surface, moons, solar, stars or galaxy), `steps` (the ones this view offers, for example `solar stars galaxy`; all five when it is left off; they always keep the
 * design's order), `label` (the group's name for a screen reader), `placement` (`fixed` by default, `absolute` or `static`), `lang`. Each step is a `<button>` with `aria-pressed`.
 * The page hears `kazoku-scalechange` with `{ value, previous, reason }`. Parts: `group`, `step`, `pill`.
 *
 * @example
 * <kazoku-scale-switch value="solar" steps="surface solar stars galaxy"></kazoku-scale-switch>
 */
export class ScaleSwitchElement extends InterfacePart {
  static observedAttributes = ["value", "steps", "label", "lang"];

  #group!: HTMLElement;
  #value: ScaleStep | undefined;
  #shown = "";

  /** The step now. Setting it to one this view does not offer is ignored. */
  get value(): ScaleStep {
    return this.#value ?? (parseScaleSteps(this.getAttribute("steps"))[0] as ScaleStep);
  }

  set value(next: ScaleStep) {
    this.#choose(next, "set");
  }

  protected styles(): string {
    return STYLES;
  }

  protected build(): void {
    this.#group = h(this.ownerDocument, "div", { class: "group panel float", role: "group", part: "group" });
    this.#group.addEventListener("click", (event) => {
      const step = (event.target as Element).closest<HTMLButtonElement>("button[data-v]");
      if (step !== null) this.#choose(step.dataset["v"] as ScaleStep, "user");
    });
    this.root.append(this.#group);
  }

  #choose(next: string, reason: "user" | "set"): void {
    if (!isScaleStep(next) || !parseScaleSteps(this.getAttribute("steps")).includes(next) || next === this.#value) return;
    const previous = this.#value;
    this.#value = next;
    if (this.getAttribute("value") !== next) this.setAttribute("value", next);
    if (this.ready) this.paint();
    this.emit<ScaleChangeDetail>(SCALE_EVENT, { value: next, previous, reason });
  }

  protected paint(): void {
    const steps = parseScaleSteps(this.getAttribute("steps"));
    const asked = this.getAttribute("value");
    if (isScaleStep(asked) && steps.includes(asked)) this.#value = asked;
    else if (this.#value === undefined || !steps.includes(this.#value)) this.#value = steps[0];
    setAttr(this.#group, "aria-label", this.getAttribute("label") ?? this.words.scale);
    const shape = steps.join("|");
    if (shape !== this.#shown) {
      const doc = this.ownerDocument;
      this.#group.replaceChildren(h(doc, "p", { class: "label title", "data-title": "", "aria-hidden": "true" }), ...steps.map((step) => h(doc, "button", { type: "button", part: "step", "data-v": step }, [h(doc, "span", { class: "pill", part: "pill" })])));
      this.#shown = shape;
    }
    setText(this.#group.querySelector("[data-title]") as Element, this.getAttribute("label") ?? this.words.scale);
    steps.forEach((step, at) => {
      const button = this.#group.children[at + 1] as HTMLButtonElement;
      setText(button.firstElementChild as Element, scaleName(step, this.words));
      setAttr(button, "aria-pressed", String(step === this.#value));
    });
  }
}
