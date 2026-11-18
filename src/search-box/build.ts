// The box's own parts, made once: the field with its label, input, popup (chips, grid, count and note) and the polite status line. Moved out of element.ts as it was; the listeners are added by the element.

export interface BoxParts {
  field: HTMLElement;
  input: HTMLInputElement;
  panel: HTMLElement;
  chips: HTMLElement;
}

export function buildBox(doc: Document): BoxParts {
  const make = <K extends keyof HTMLElementTagNameMap>(tag: K, className?: string): HTMLElementTagNameMap[K] => {
    const el = doc.createElement(tag);
    if (className) el.className = className;
    return el;
  };
  const field = make("div", "field");
  const label = make("label", "vh");
  label.setAttribute("for", "q");
  const input = make("input");
  input.id = "q";
  input.type = "text";
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-haspopup", "grid");
  input.setAttribute("aria-expanded", "false");
  input.setAttribute("aria-controls", "grid");
  input.autocomplete = "off";
  input.setAttribute("autocapitalize", "off");
  input.spellcheck = false;
  const panel = make("div", "panel");
  panel.hidden = true;
  const chips = make("div", "chips");
  chips.setAttribute("role", "group");
  chips.hidden = true;
  const grid = make("div");
  grid.id = "grid";
  grid.setAttribute("role", "grid");
  grid.hidden = true;
  const note = make("p", "note");
  note.hidden = true;
  // under a narrowed list that has more rows than are drawn: "Showing 40 of 9,812". Plain text, not live: the box does not talk while the reader scrolls
  const count = make("p", "count");
  count.hidden = true;
  const list = make("div", "list");
  list.append(chips, grid, count, note);
  panel.append(list);
  const status = make("div", "vh");
  status.id = "status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  field.append(label, input, panel, status);
  return { field, input, panel, chips };
}
