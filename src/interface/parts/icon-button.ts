// <kazoku-icon-button>: part 1. A real <button>, 44 by 44 px, an 18 px icon (20 on a phone) stroked 1.75 with round caps, clear at rest, filled `line` on hover and when on, always with an accessible name.
import { flag, h, iconElement, setAttr } from "../dom.ts";
import { InterfacePart } from "../part.ts";
import { isIconName, type IconName } from "../icons.ts";
import { PHONE, UI_BASE } from "../styles.ts";
import { kui, RADII, SIZES } from "../tokens.ts";

export const ICON_BUTTON_TAG = "kazoku-icon-button";

const STYLES = `${UI_BASE}
:host { display: inline-block; }
button { display: inline-flex; align-items: center; justify-content: center; width: ${SIZES.touch}px; height: ${SIZES.touch}px; min-width: ${SIZES.touch}px; padding: 0; border: 0; border-radius: var(--kui-radius-control, ${RADII.control}px); background: transparent; color: ${kui("text")}; }
button:hover:not(:disabled), button[data-on] { background: ${kui("line")}; }
button[data-on] { color: ${kui("sun")}; }
svg { display: block; width: ${SIZES.icon}px; height: ${SIZES.icon}px; flex: none; }
::slotted(svg) { width: ${SIZES.icon}px; height: ${SIZES.icon}px; }
${PHONE} { svg, ::slotted(svg) { width: ${SIZES.iconPhone}px; height: ${SIZES.iconPhone}px; } }
@media (forced-colors: active) { button { border: 1px solid ButtonText; } button[data-on] { background: Highlight; color: HighlightText; } }
`;

/**
 * An icon you press. It is a real `<button>` with an accessible name, 44 by 44 px.
 *
 * Attributes: `icon` (a built-in name: slower, play, pause, faster, now, place, layers, look, flight, close, search, menu; or put your own `<svg>` inside the tag),
 * `label` (the accessible name; a built-in icon has one in English and Japanese when you give none), `pressed` (`true` or `false`: a toggle, read as `aria-pressed`),
 * `expanded` (`true` or `false`: opens something, read as `aria-expanded`), `on` (shown as on without saying so to a screen reader; for a button whose name changes, such as Play and Pause),
 * `disabled`, `lang`. Parts: `button`. Pressing it, by pointer, touch, Enter or Space, fires a native `click` that bubbles out of the tag.
 *
 * @example
 * <kazoku-icon-button icon="layers" expanded="false"></kazoku-icon-button>
 */
export class IconButtonElement extends InterfacePart {
  static observedAttributes = ["icon", "label", "pressed", "expanded", "on", "disabled", "lang"];

  #button!: HTMLButtonElement;
  #icon: SVGSVGElement | undefined;
  #shown: string | null = null;

  constructor() {
    super();
    // A disabled button inside never fires; this stops a `click()` on the tag itself, too.
    this.addEventListener("click", (event) => this.hasAttribute("disabled") && event.stopImmediatePropagation(), true);
  }

  /** The real button inside, for a test or a page that wants to focus it. */
  get button(): HTMLButtonElement {
    return this.#button;
  }

  protected styles(): string {
    return STYLES;
  }

  protected build(): void {
    const doc = this.ownerDocument;
    this.#button = h(doc, "button", { type: "button", part: "button" }, [h(doc, "slot")]);
    this.root.append(this.#button);
  }

  protected paint(): void {
    const name = this.getAttribute("icon");
    if (this.#shown !== name) {
      this.#icon?.remove();
      this.#icon = undefined;
      if (isIconName(name)) {
        this.#icon = iconElement(this.ownerDocument, name as IconName);
        this.#button.prepend(this.#icon);
      }
      this.#shown = name;
    }
    const label = this.getAttribute("label") ?? (isIconName(name) ? this.words[name] : "");
    setAttr(this.#button, "aria-label", label === "" ? null : label);
    const pressed = this.getAttribute("pressed");
    setAttr(this.#button, "aria-pressed", pressed === "true" || pressed === "false" ? pressed : pressed === "" ? "true" : null);
    const expanded = this.getAttribute("expanded");
    setAttr(this.#button, "aria-expanded", expanded === "true" || expanded === "false" ? expanded : expanded === "" ? "true" : null);
    this.#button.toggleAttribute("data-on", pressed === "true" || pressed === "" || expanded === "true" || expanded === "" || flag(this, "on"));
    this.#button.disabled = this.hasAttribute("disabled");
  }
}
