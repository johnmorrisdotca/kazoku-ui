// <kazoku-layers-panel>: part 5. A 320 px panel above the control bar on the right: the label "Layers", then real checkboxes with labels in two columns, checked in `sun`. It replaces each demo's own Show and Hide
// toggles. It also lists the outside data sources the data door tells of, each with its credit and licence, so one can be switched off.
import { h, setAttr, setText } from "../dom.ts";
import { say } from "../card.ts";
import { type LayerItem, type LayerSource, licenceText } from "../layers.ts";
import { InterfacePart } from "../part.ts";
import { PHONE, PLACEMENT, UI_BASE } from "../styles.ts";
import { kui, SIZES } from "../tokens.ts";

export const LAYERS_PANEL_TAG = "kazoku-layers-panel";
export const LAYER_EVENT = "kazoku-layerchange";

/** What `kazoku-layerchange` carries in `detail`. */
export interface LayerChangeDetail {
  /** `layer` for one of the view's own layers, `source` for an outside data source. */
  kind: "layer" | "source";
  id: string;
  checked: boolean;
}

const STYLES = `${UI_BASE}
:host { position: fixed; right: 16px; bottom: 88px; z-index: 7; display: block; width: ${SIZES.panel}px; max-width: calc(100vw - 32px); }
${PLACEMENT}
.box { max-height: calc(100vh - 180px); overflow-y: auto; padding: 16px 20px 12px; }
.grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 12px; margin: 8px 0 0; padding: 0; list-style: none; }
.one { grid-template-columns: minmax(0, 1fr); }
.sources { margin-top: 12px; padding-top: 12px; border-top: 1px solid ${kui("line")}; }
li { min-width: 0; }
label { display: flex; align-items: center; gap: 10px; min-height: ${SIZES.touch}px; color: ${kui("text")}; font-size: 14px; cursor: pointer; }
input[type="checkbox"] { flex: none; width: 20px; height: 20px; margin: 0; accent-color: ${kui("sun")}; cursor: pointer; }
.src { padding: 2px 0 8px 30px; margin-top: -8px; color: ${kui("text-quiet")}; font-size: 12px; line-height: 1.4; }
.src a { color: ${kui("sky")}; }
${PHONE} { :host { right: 12px; left: 12px; bottom: ${SIZES.controlBarPhone + 8}px; width: auto; max-width: none; } .box { max-height: calc(100vh - ${SIZES.controlBarPhone + SIZES.topBarPhone + 64}px); } }
@media (forced-colors: active) { input[type="checkbox"] { accent-color: Highlight; } }
`;

/**
 * Give it `layers` (each `{ id, label, checked }`) and, when the data door has outside sources, `sources` (from `sourcesFromCredits`). Each is a real `<input type="checkbox">` with a `<label>`.
 * The page hears `kazoku-layerchange` with `{ kind, id, checked }` and applies it; the panel changes nothing itself. Attributes: `label` (the heading; "Layers" by default), `placement`, `lang`.
 * Parts: `box`, `heading`, `layers`, `sources`.
 *
 * @example
 * panel.layers = [{ id: "orbits", label: { en: "Orbits", ja: "軌道" }, checked: true }];
 * panel.addEventListener("kazoku-layerchange", (e) => console.log(e.detail));
 */
export class LayersPanelElement extends InterfacePart {
  static observedAttributes = ["label", "placement", "lang"];

  #layers: readonly LayerItem[] = [];
  #sources: readonly LayerSource[] = [];
  #box!: HTMLElement;
  #shape = "";

  /** The view's own layers. */
  get layers(): readonly LayerItem[] {
    return this.#layers;
  }

  set layers(next: readonly LayerItem[]) {
    this.#layers = next;
    if (this.ready) this.paint();
  }

  /** The outside data sources, and whether each is on. */
  get sources(): readonly LayerSource[] {
    return this.#sources;
  }

  set sources(next: readonly LayerSource[]) {
    this.#sources = next;
    if (this.ready) this.paint();
  }

  protected styles(): string {
    return STYLES;
  }

  protected build(): void {
    this.#box = h(this.ownerDocument, "section", { class: "box panel float", part: "box" });
    this.#box.addEventListener("change", (event) => {
      const box = event.target as HTMLInputElement;
      const kind = box.dataset["kind"] as LayerChangeDetail["kind"];
      const id = box.dataset["id"] as string;
      if (kind === "layer") this.#layers = this.#layers.map((layer) => (layer.id === id ? { ...layer, checked: box.checked } : layer));
      else this.#sources = this.#sources.map((source) => (source.info.id === id ? { ...source, enabled: box.checked } : source));
      this.emit<LayerChangeDetail>(LAYER_EVENT, { kind, id, checked: box.checked });
    });
    this.root.append(this.#box);
  }

  #row(kind: "layer" | "source", id: string, text: string): HTMLElement {
    const doc = this.ownerDocument;
    const input = h(doc, "input", { type: "checkbox", "data-kind": kind, "data-id": id });
    return h(doc, "li", {}, [h(doc, "label", {}, [input, h(doc, "span", { "data-t": "" }, [text])])]);
  }

  protected paint(): void {
    const doc = this.ownerDocument;
    const language = this.language;
    const shape = JSON.stringify([this.#layers.map((layer) => layer.id), this.#sources.map((source) => source.info.id)]);
    if (shape !== this.#shape) {
      const layers = h(doc, "ul", { class: "grid", part: "layers" }, this.#layers.map((layer) => this.#row("layer", layer.id, "")));
      const parts: HTMLElement[] = [h(doc, "p", { class: "label", part: "heading", "data-heading": "" }), layers];
      if (this.#sources.length > 0) {
        const list = h(doc, "ul", { class: "grid one", part: "sources" }, this.#sources.map((source) => this.#row("source", source.info.id, "")));
        this.#sources.forEach((source, at) => list.children[at]?.append(h(doc, "p", { class: "src", "data-src": "" })));
        parts.push(h(doc, "div", { class: "sources" }, [h(doc, "p", { class: "label", "data-sources-heading": "" }), list]));
      }
      this.#box.replaceChildren(...parts);
      this.#shape = shape;
    }
    setText(this.#box.querySelector("[data-heading]") as Element, this.getAttribute("label") ?? this.words.layersTitle);
    const heading = this.#box.querySelector("[data-sources-heading]");
    if (heading !== null) setText(heading, this.words.dataSources);
    this.#layers.forEach((layer, at) => {
      const item = this.#box.querySelector(".grid:not(.one)")?.children[at];
      if (item === undefined) return;
      setText(item.querySelector("[data-t]") as Element, say(layer.label, language));
      (item.querySelector("input") as HTMLInputElement).checked = layer.checked;
    });
    this.#sources.forEach((source, at) => {
      const item = this.#box.querySelector(".grid.one")?.children[at];
      if (item === undefined) return;
      setText(item.querySelector("[data-t]") as Element, say(source.info.name, language));
      (item.querySelector("input") as HTMLInputElement).checked = source.enabled;
      const note = item.querySelector(".src") as HTMLElement;
      const link = h(doc, "a", { href: source.info.licence.url }, [licenceText(source.info, this.words)]);
      note.replaceChildren(`${say(source.info.credit, language)} `, link);
    });
    setAttr(this.#box, "aria-label", this.getAttribute("label") ?? this.words.layersTitle);
  }
}
