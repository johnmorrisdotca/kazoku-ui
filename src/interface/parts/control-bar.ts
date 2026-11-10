// <kazoku-control-bar>: part 2. One floating panel, bottom centre on a desk and fixed full width at the bottom of a phone (116 px), in the design's fixed order: Slower, Play or Pause, Faster, the clock
// (two lines in mono: the moment shown, and the speed in plain words; a button that opens a date and time picker), Back to now, a divider, Your place, Layers, Look, Free flight.
// It drives the family clock (a `BarClock`); the other buttons tell the page, which does the work.
import { type BarClock, canStep, formatMoment, fromInputValue, SPEED_LADDER, speedWords, stepSpeed, toInputValue } from "../clock.ts";
import { CONTROL_ORDER, type ControlName, lookName, nextLook, parseControls, parseLooks, TIME_CONTROLS, type Look } from "../controls.ts";
import { flag, h, setAttr, setText } from "../dom.ts";
import { InterfacePart } from "../part.ts";
import { MONO, PHONE, PLACEMENT, UI_BASE } from "../styles.ts";
import { kui, RADII, SIZES } from "../tokens.ts";
import { defineBasics } from "./basics.ts";

export const CONTROL_BAR_TAG = "kazoku-control-bar";
export const CONTROL_EVENT = "kazoku-control";

/** What `kazoku-control` carries in `detail`: which control was pressed, and what it now stands for. */
export interface ControlDetail {
  action: ControlName;
  /** For `look` the look now chosen; for `layers`, `place` and `flight` whether they are on; for `play` whether the clock is running; for `slower` and `faster` the speed; for `clock` the moment set. */
  value: string | number | boolean | undefined;
}

const STYLES = `${UI_BASE}
:host { position: fixed; left: 50%; bottom: 16px; z-index: 8; display: block; transform: translateX(-50%); }
${PLACEMENT}
.bar { display: flex; align-items: center; gap: 2px; padding: 6px; }
.clock { display: flex; flex-direction: column; justify-content: center; align-items: center; min-width: 176px; height: ${SIZES.touch}px; padding: 0 12px; border: 0; border-radius: var(--kui-radius-control, ${RADII.control}px); background: transparent; color: ${kui("text")}; font-family: ${MONO}; font-variant-numeric: tabular-nums; text-align: center; }
.clock:hover, .clock[aria-expanded="true"] { background: ${kui("line")}; }
.t { font-size: 13px; line-height: 1.3; white-space: nowrap; }
.s { color: ${kui("sun")}; font-size: 11px; line-height: 1.3; white-space: nowrap; }
.divider { flex: none; width: 1px; height: 28px; margin: 0 6px; background: ${kui("line")}; }
.picker { position: absolute; bottom: calc(100% + 8px); left: 50%; width: 280px; max-width: calc(100vw - 24px); padding: 16px; transform: translateX(-50%); }
.picker p { margin: 0 0 8px; }
.picker input { width: 100%; min-height: 44px; padding: 0 10px; border: 1px solid ${kui("line-strong")}; border-radius: var(--kui-radius-control, ${RADII.control}px); background: ${kui("page")}; color: ${kui("text")}; font-family: ${MONO}; font-size: 14px; color-scheme: dark; }
.picker .row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px; }
${PHONE} {
  :host { left: 0; right: 0; bottom: 0; transform: none; }
  :host([placement="absolute"]) { position: absolute; }
  :host([placement="static"]) { position: relative; }
  .bar { flex-wrap: wrap; justify-content: space-between; align-content: center; gap: 4px 0; min-height: ${SIZES.controlBarPhone}px; padding: 8px 8px max(10px, env(safe-area-inset-bottom)); border-width: 1px 0 0; border-radius: 0; }
  .clock { order: -1; flex: 0 0 100%; flex-direction: row; gap: 10px; height: 40px; }
  .divider { display: none; }
  .picker { bottom: calc(100% + 8px); }
}
`;

/**
 * Give it the family clock in the `clock` property (a `BarClock`: a moment, a speed, play and pause). It drives that clock and shows it; with no clock it still tells the page what was pressed.
 *
 * Attributes: `controls` (the ones this view has, for example `play clock layers`; all nine by default, always in the design's order, so a view that cannot do one just leaves it out), `looks` (`line realistic painted`,
 * the ones this view has), `look` (the one now), `layers-open` (the Layers button is on), `flight` (Free flight is on), `place-on` (Your place is on: the view shows the sky from where the reader is), `timezone` (`utc`, or the reader's own zone by default), `placement` (`fixed`, `absolute`, `static`), `lang`.
 * Every press also fires `kazoku-control` with `{ action, value }`. Reduced motion is the clock's to honour (it opens paused with Play ready); the bar never starts anything by itself.
 * Parts: `bar`, `clock`, `picker`.
 *
 * @example
 * bar.clock = createFamilyClock();
 * bar.addEventListener("kazoku-control", (e) => e.detail.action === "layers" && togglePanel());
 */
export class ControlBarElement extends InterfacePart {
  static observedAttributes = ["controls", "looks", "look", "layers-open", "flight", "place-on", "timezone", "lang"];

  #clock: BarClock | undefined;
  #stopClock: (() => void) | undefined;
  #bar!: HTMLElement;
  #clockButton!: HTMLButtonElement;
  #picker!: HTMLElement;
  #input!: HTMLInputElement;
  #status!: HTMLElement;
  #look: Look | undefined;
  #shape = "";
  #outside = (event: Event): void => {
    if (!event.composedPath().includes(this)) this.#closePicker(false);
  };

  /** The clock this bar drives. */
  get clock(): BarClock | undefined {
    return this.#clock;
  }

  set clock(next: BarClock | undefined) {
    this.#stopClock?.();
    this.#stopClock = undefined;
    this.#clock = next;
    if (this.ready) {
      this.#subscribe();
      this.paint();
    }
  }

  /** Whether the date and time picker is open. */
  get pickerOpen(): boolean {
    return !this.#picker.hidden;
  }

  /** The look now chosen. */
  get look(): Look {
    return this.#look ?? parseLooks(this.getAttribute("looks"))[0] ?? "line";
  }

  set look(next: Look) {
    this.#look = next;
    this.setAttribute("look", next);
  }

  protected styles(): string {
    return STYLES;
  }

  protected build(): void {
    defineBasics();
    const doc = this.ownerDocument;
    this.#bar = h(doc, "div", { class: "bar panel float", role: "group", part: "bar" });
    this.#clockButton = h(doc, "button", { class: "clock", type: "button", part: "clock", "aria-haspopup": "dialog", "aria-expanded": "false" }, [h(doc, "span", { class: "t" }), h(doc, "span", { class: "s" })]);
    this.#clockButton.addEventListener("click", () => (this.#picker.hidden ? this.#openPicker() : this.#closePicker(true)));
    this.#bar.addEventListener("click", (event) => {
      const button = (event.target as Element).closest<HTMLElement>("kazoku-icon-button[data-act]");
      if (button !== null && !button.hasAttribute("disabled")) this.#press(button.dataset["act"] as ControlName);
    });
    this.#input = h(doc, "input", { type: "datetime-local", id: "when" });
    const form = h(doc, "form", { class: "picker panel float", role: "dialog", part: "picker", hidden: true }, [
      h(doc, "p", { class: "label", "data-title": "" }),
      h(doc, "label", { class: "vh", for: "when", "data-field": "" }),
      this.#input,
      h(doc, "div", { class: "row" }, [h(doc, "kazoku-button", { variant: "filled", "data-set": "" }), h(doc, "kazoku-button", { "data-cancel": "" })]),
    ]);
    this.#picker = form;
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      this.#applyPicker();
    });
    form.querySelector("[data-set]")?.addEventListener("click", () => this.#applyPicker());
    form.querySelector("[data-cancel]")?.addEventListener("click", () => this.#closePicker(true));
    form.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        this.#closePicker(true);
      }
    });
    this.#status = h(doc, "div", { class: "vh", role: "status", "aria-live": "polite" });
    this.root.append(this.#bar, form, this.#status);
  }

  protected listen(): (() => void)[] {
    this.#subscribe();
    this.ownerDocument.addEventListener("pointerdown", this.#outside, true);
    return [() => this.#stopClock?.(), () => this.ownerDocument.removeEventListener("pointerdown", this.#outside, true)];
  }

  #subscribe(): void {
    this.#stopClock?.();
    this.#stopClock = this.#clock?.onChange((change) => {
      this.paint();
      if (change.reason !== "tick") this.#say();
    });
  }

  #say(): void {
    const clock = this.#clock;
    if (clock !== undefined) setText(this.#status, speedWords(clock.speed, this.language, clock.running, this.words));
  }

  #zone(): "utc" | "local" {
    return this.getAttribute("timezone")?.toLowerCase() === "utc" ? "utc" : "local";
  }

  #press(action: ControlName): void {
    const clock = this.#clock;
    let value: ControlDetail["value"];
    if (action === "slower" || action === "faster") {
      if (clock !== undefined) {
        clock.setSpeed(stepSpeed(clock.speed, action === "faster" ? 1 : -1, SPEED_LADDER));
        value = clock.speed;
      }
    } else if (action === "play") {
      if (clock !== undefined) {
        if (clock.running) clock.pause();
        else clock.play();
        value = clock.running;
      }
    } else if (action === "now") {
      clock?.set("now");
    } else if (action === "layers") {
      const open = !flag(this, "layers-open");
      this.toggleAttribute("layers-open", open);
      value = open;
    } else if (action === "flight" || action === "place") {
      const attr = action === "flight" ? "flight" : "place-on";
      const on = !flag(this, attr);
      this.toggleAttribute(attr, on);
      value = on;
    } else if (action === "look") {
      this.look = nextLook(this.look, parseLooks(this.getAttribute("looks")));
      value = this.look;
    }
    this.emit<ControlDetail>(CONTROL_EVENT, { action, value });
  }

  #openPicker(): void {
    const clock = this.#clock;
    this.#input.value = clock === undefined ? "" : toInputValue(clock.time, this.#zone());
    this.#picker.hidden = false;
    this.#clockButton.setAttribute("aria-expanded", "true");
    this.#input.focus();
  }

  #closePicker(returnFocus: boolean): void {
    if (this.#picker.hidden) return;
    this.#picker.hidden = true;
    this.#clockButton.setAttribute("aria-expanded", "false");
    if (returnFocus) this.#clockButton.focus();
  }

  #applyPicker(): void {
    const ms = fromInputValue(this.#input.value, this.#zone());
    if (!Number.isFinite(ms)) {
      this.#input.focus();
      return;
    }
    this.#clock?.set(ms);
    this.#closePicker(true);
    this.emit<ControlDetail>(CONTROL_EVENT, { action: "clock", value: ms });
  }

  protected paint(): void {
    const doc = this.ownerDocument;
    const { words, language } = this;
    const have = parseControls(this.getAttribute("controls"));
    const shape = have.join("|");
    if (shape !== this.#shape) {
      const parts: Node[] = [];
      let divided = false;
      for (const name of CONTROL_ORDER) {
        if (!have.includes(name)) continue;
        if (!divided && !TIME_CONTROLS.includes(name)) {
          divided = true;
          if (parts.length > 0) parts.push(h(doc, "span", { class: "divider", role: "separator", "aria-orientation": "vertical" }));
        }
        parts.push(name === "clock" ? this.#clockButton : h(doc, "kazoku-icon-button", { "data-act": name, icon: name }));
      }
      this.#bar.replaceChildren(...parts);
      this.#shape = shape;
    }
    setAttr(this.#bar, "aria-label", this.words.controlBar);
    const clock = this.#clock;
    const running = clock?.running === true;
    for (const button of this.#bar.querySelectorAll<HTMLElement>("kazoku-icon-button")) {
      const act = button.dataset["act"] as ControlName;
      setAttr(button, "lang", language);
      if (act === "play") {
        setAttr(button, "icon", running ? "pause" : "play");
        setAttr(button, "label", running ? words.pause : words.play);
        button.toggleAttribute("on", running);
      } else if (act === "slower" || act === "faster") {
        button.toggleAttribute("disabled", clock !== undefined && !canStep(clock.speed, act === "faster" ? 1 : -1, SPEED_LADDER));
      } else if (act === "layers") {
        setAttr(button, "expanded", String(flag(this, "layers-open")));
      } else if (act === "flight" || act === "place") {
        setAttr(button, "pressed", String(flag(this, act === "flight" ? "flight" : "place-on")));
      } else if (act === "look") {
        setAttr(button, "label", `${words.look}: ${lookName(this.look, words)}`);
      }
    }
    const moment = clock === undefined ? "—" : formatMoment(clock.time, language, this.#zone());
    const speed = clock === undefined ? "" : speedWords(clock.speed, language, clock.running, words);
    setText(this.#clockButton.children[0] as Element, moment);
    setText(this.#clockButton.children[1] as Element, speed);
    setAttr(this.#clockButton, "aria-label", `${moment}, ${speed}. ${words.clockButton}`);
    setText(this.#picker.querySelector("[data-title]") as Element, words.pickerTitle);
    setText(this.#picker.querySelector("[data-field]") as Element, words.pickerField);
    setAttr(this.#picker, "aria-label", words.pickerTitle);
    setText(this.#picker.querySelector("[data-set]") as Element, words.pickerSet);
    setText(this.#picker.querySelector("[data-cancel]") as Element, words.pickerCancel);
    for (const one of this.#picker.querySelectorAll("kazoku-button")) setAttr(one, "lang", language);
  }
}
