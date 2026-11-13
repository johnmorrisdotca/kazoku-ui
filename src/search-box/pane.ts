// The preview pane: one region the box fills with the highlighted row's preview. It is built once and filled again for each preview; it never fetches, and it keeps what it shows until the next preview is ready.
import { drawPaths, drawRowIcon } from "./draw.ts";
import { iconPaths } from "./icons.ts";
import { isActionEnabled, type PreviewView, type SearchAction } from "./model.ts";
import type { SearchBoxWords } from "./words.ts";

/** Who the pane is showing, so a press on one of its buttons reaches that row's action. */
export interface PaneRow {
  group: string;
  id: string;
}

export interface PaneHandlers {
  /** A press on one of the pane's action buttons. */
  action(row: PaneRow, actionId: string): void;
  /** A press on the sheet's Back button. */
  back(): void;
}

/** What the box keeps of the pane. */
export interface PreviewPane {
  readonly el: HTMLElement;
  /** The row whose preview is shown, or undefined when the pane shows its hint. */
  readonly shown: PaneRow | undefined;
  /** The words the pane says (set again when the language changes). */
  words(words: SearchBoxWords): void;
  /** The pane says what to do, and shows nothing of any row. */
  hint(): void;
  /** Draw a preview, replacing what was shown. `pressed` gives a toggle's state now. */
  show(row: PaneRow, view: PreviewView, actions: readonly SearchAction[], pressed: (actionId: string) => boolean | undefined): void;
  /** A request is out. With nothing shown yet the pane says it is loading; otherwise it keeps what it shows. */
  wait(): void;
  /** The request has taken a while: what is shown is the last row's, and the pane says so by its look. */
  stale(): void;
  /** The request failed: the pane says so. */
  fail(): void;
  /** Set a toggle button's state in the pane without redrawing it. */
  setPressed(row: PaneRow, actionId: string, pressed: boolean): void;
  /** Show or hide the Back button (it belongs to the sheet on a narrow screen). */
  sheet(on: boolean): void;
}

/**
 * Builds the pane. It is a labelled region, not a dialog and not a focus trap: the box keeps the focus, and the pane is the description of the highlighted row. Its buttons are for a pointer; a keyboard reaches the same actions
 * through the grid, so they are out of the tab order and hidden from a screen reader.
 *
 * @example
 * const pane = createPreviewPane(document, { action: (row, id) => console.log(row.id, id), back: () => {} });
 */
export function createPreviewPane(doc: Document, handlers: PaneHandlers): PreviewPane {
  const make = <K extends keyof HTMLElementTagNameMap>(tag: K, className: string): HTMLElementTagNameMap[K] => {
    const el = doc.createElement(tag);
    el.className = className;
    return el;
  };
  const el = make("div", "preview");
  el.id = "pv";
  el.setAttribute("role", "region");
  el.hidden = true;
  const back = make("button", "pv-back");
  back.type = "button";
  back.tabIndex = -1;
  back.hidden = true;
  const note = make("p", "pv-note");
  const body = make("div", "pv-body");
  body.hidden = true;
  const pic = make("div", "pv-pic");
  pic.hidden = true;
  const head = make("div", "pv-head");
  const heading = make("div", "pv-name");
  const title = make("span", "pv-title");
  const kind = make("span", "pv-kind");
  heading.append(title, kind);
  const facts = make("dl", "pv-facts");
  const acts = make("div", "pv-acts");
  acts.setAttribute("aria-hidden", "true");
  head.append(heading);
  body.append(pic, head, facts, acts);
  el.append(back, note, body);

  let shown: PaneRow | undefined;
  let current = { hint: "", loading: "", failed: "" };
  const buttons = new Map<string, HTMLButtonElement>();

  back.addEventListener("click", () => handlers.back());
  acts.addEventListener("click", (event) => {
    const button = (event.target as Element | null)?.closest<HTMLButtonElement>("button[data-act]");
    if (button && shown !== undefined && button.getAttribute("aria-disabled") !== "true") handlers.action(shown, button.dataset.act ?? "");
  });

  const say = (text: string): void => {
    note.textContent = text;
    note.hidden = text === "";
  };

  return {
    el,
    get shown() {
      return shown;
    },
    words(words) {
      el.setAttribute("aria-label", words.preview);
      back.textContent = `‹ ${words.back}`;
      current = { hint: words.previewHint, loading: words.previewLoading, failed: words.previewFailed };
      if (shown === undefined && !note.hidden) say(note.dataset.kind === "loading" ? current.loading : note.dataset.kind === "failed" ? current.failed : current.hint);
    },
    hint() {
      shown = undefined;
      body.hidden = true;
      el.removeAttribute("aria-busy");
      el.removeAttribute("data-stale");
      note.dataset.kind = "hint";
      say(current.hint);
    },
    show(row, view, actions, pressed) {
      shown = row;
      el.removeAttribute("aria-busy");
      el.removeAttribute("data-stale");
      note.dataset.kind = "";
      say("");
      body.hidden = false;
      // the picture's box is drawn only when there is something for it: a picture that loads when this preview is shown, or the page's own node
      pic.replaceChildren();
      pic.removeAttribute("data-failed");
      if (view.element !== undefined) pic.append(view.element);
      else if (view.picture !== undefined) {
        const img = doc.createElement("img");
        img.alt = view.pictureAlt;
        img.decoding = "async";
        img.loading = "lazy";
        img.referrerPolicy = "no-referrer";
        img.src = view.picture;
        img.addEventListener("error", () => pic.setAttribute("data-failed", ""));
        pic.append(img);
      }
      pic.hidden = view.element === undefined && view.picture === undefined;
      head.querySelector(".ico")?.remove();
      if (view.icon !== undefined) head.prepend(drawRowIcon(doc, view.icon));
      title.textContent = view.title;
      kind.textContent = view.kind;
      facts.replaceChildren();
      for (const fact of view.facts) {
        const term = doc.createElement("dt");
        term.textContent = fact.label;
        const value = doc.createElement("dd");
        value.textContent = fact.value;
        facts.append(term, value);
      }
      facts.hidden = view.facts.length === 0;
      acts.replaceChildren();
      buttons.clear();
      for (const action of actions) {
        const button = doc.createElement("button");
        button.type = "button";
        button.tabIndex = -1;
        button.dataset.act = action.id;
        const paths = iconPaths(action.icon);
        if (paths) button.append(drawPaths(doc, paths));
        button.append(doc.createTextNode(action.label));
        const state = pressed(action.id);
        if (state !== undefined) button.setAttribute("aria-pressed", String(state));
        if (!isActionEnabled(action)) {
          button.setAttribute("aria-disabled", "true");
          if (action.title) button.title = action.title;
        }
        buttons.set(action.id, button);
        acts.append(button);
      }
      acts.hidden = actions.length === 0;
    },
    wait() {
      if (shown === undefined) {
        note.dataset.kind = "loading";
        say(current.loading);
      }
      el.setAttribute("aria-busy", "true");
    },
    stale() {
      el.setAttribute("data-stale", "");
    },
    fail() {
      el.removeAttribute("aria-busy");
      el.removeAttribute("data-stale");
      note.dataset.kind = "failed";
      say(current.failed);
    },
    setPressed(row, actionId, pressed) {
      if (shown?.group === row.group && shown.id === row.id) buttons.get(actionId)?.setAttribute("aria-pressed", String(pressed));
    },
    sheet(on) {
      back.hidden = !on;
    },
  };
}
