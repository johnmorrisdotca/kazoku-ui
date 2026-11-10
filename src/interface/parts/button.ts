// <kazoku-button>: part 7. One filled `sun` button a screen, for the one main thing to do; everything else is outlined or an icon. A real <a href> when it has a `href`, else a real <button>.
import { h, iconElement, setAttr } from "../dom.ts";
import { isIconName } from "../icons.ts";
import { InterfacePart } from "../part.ts";
import { PHONE, UI_BASE } from "../styles.ts";
import { kui, RADII } from "../tokens.ts";

export const BUTTON_TAG = "kazoku-button";

const STYLES = `${UI_BASE}
:host { display: inline-block; }
.b { display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 100%; min-height: 48px; padding: 0 20px; border: 1px solid ${kui("line-strong")}; border-radius: var(--kui-radius-control, ${RADII.control}px); background: transparent; color: ${kui("text")}; font-size: 14px; font-weight: 600; line-height: 1.2; text-decoration: none; white-space: nowrap; }
.b svg { width: 18px; height: 18px; flex: none; }
.b:hover:not(:disabled) { border-color: ${kui("text-quiet")}; color: ${kui("text")}; background: ${kui("line")}; }
:host([variant="filled"]) .b { border-color: ${kui("sun")}; background: ${kui("sun")}; color: ${kui("on-sun")}; }
:host([variant="filled"]) .b:hover:not(:disabled) { filter: brightness(1.08); color: ${kui("on-sun")}; background: ${kui("sun")}; border-color: ${kui("sun")}; }
${PHONE} { .b { min-height: 44px; } }
@media (forced-colors: active) { :host([variant="filled"]) .b { background: Highlight; color: HighlightText; border-color: Highlight; } }
`;

/** How many filled buttons are showing in `scope` (the page, or the nearest `[data-screen]` around a button), in the light DOM. The design allows one a screen. */
export function filledButtonCount(scope: ParentNode): number {
  return [...scope.querySelectorAll(`${BUTTON_TAG}[variant="filled"]`)].filter((button) => !(button as HTMLElement).hidden && button.closest("[hidden]") === null).length;
}

/**
 * A button for the main thing to do (`variant="filled"`, in `sun`; one a screen) or for anything else (outlined, the default).
 *
 * Attributes: `variant` (`filled` or `outlined`), `href` (makes it a link, a real `<a href>`), `target`, `rel`, `disabled` (a button only), `icon` (a built-in icon name, drawn before the words), `lang`. The words inside the tag are the label.
 * A second filled button in one screen writes a warning to the console, once; mark a screen with `data-screen` on its container when a page shows several at once (a gallery of examples).
 * Parts: `control` (the inner button or link). It is 48 px tall on a desk and 44 on a phone.
 *
 * @example
 * <kazoku-button variant="filled" href="mars.html">Open page</kazoku-button>
 */
export class ButtonElement extends InterfacePart {
  static observedAttributes = ["variant", "href", "target", "rel", "disabled", "icon", "lang"];

  #control: HTMLButtonElement | HTMLAnchorElement | undefined;
  #warned = false;

  /** The real button or link inside. */
  get control(): HTMLButtonElement | HTMLAnchorElement | undefined {
    return this.#control;
  }

  protected styles(): string {
    return STYLES;
  }

  protected build(): void {}

  protected paint(): void {
    const doc = this.ownerDocument;
    const href = this.getAttribute("href");
    const wantsLink = href !== null && !this.hasAttribute("disabled");
    if (this.#control === undefined || (this.#control.localName === "a") !== wantsLink) {
      this.#control = wantsLink ? h(doc, "a", { class: "b", part: "control" }, [h(doc, "slot")]) : h(doc, "button", { class: "b", type: "button", part: "control" }, [h(doc, "slot")]);
      this.root.append(this.#control);
      this.root.querySelectorAll(".b").forEach((one) => one !== this.#control && one.remove());
    }
    const control = this.#control;
    const icon = this.getAttribute("icon");
    control.querySelector("svg")?.remove();
    if (isIconName(icon)) control.prepend(iconElement(this.ownerDocument, icon));
    if (control instanceof HTMLAnchorElement) {
      setAttr(control, "href", href);
      setAttr(control, "target", this.getAttribute("target"));
      setAttr(control, "rel", this.getAttribute("rel") ?? (this.getAttribute("target") === "_blank" ? "noopener noreferrer" : null));
    } else control.disabled = this.hasAttribute("disabled");
    if (!this.#warned && this.getAttribute("variant") === "filled") {
      const scope = this.closest("[data-screen]") ?? this.ownerDocument;
      if (filledButtonCount(scope) > 1) {
        this.#warned = true;
        console.warn("kazoku-button: more than one filled button in a screen. The design allows one; make the others outlined (or mark each screen with data-screen).");
      }
    }
  }
}
