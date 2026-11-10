// Importing this registers the interface's tags (<kazoku-icon-button>, <kazoku-control-bar>, <kazoku-scale-switch>, <kazoku-object-card>, <kazoku-layers-panel>, <kazoku-segmented-switch>, <kazoku-button>,
// <kazoku-top-bar> and <kazoku-reading-page>), each unless it is already taken (the first definition wins; see view-controls/define.ts for why a taken tag is left alone), and puts the tokens on the page.
// The page footer is the page frame's third part: import `page-frame/define` for it.
import { BUTTON_TAG, ButtonElement } from "./parts/button.ts";
import { CONTROL_BAR_TAG, ControlBarElement } from "./parts/control-bar.ts";
import { ICON_BUTTON_TAG, IconButtonElement } from "./parts/icon-button.ts";
import { LAYERS_PANEL_TAG, LayersPanelElement } from "./parts/layers-panel.ts";
import { OBJECT_CARD_TAG, ObjectCardElement } from "./parts/object-card.ts";
import { READING_PAGE_TAG, ReadingPageElement } from "./parts/reading-page.ts";
import { SCALE_SWITCH_TAG, ScaleSwitchElement } from "./parts/scale-switch.ts";
import { SEGMENTED_SWITCH_TAG, SegmentedSwitchElement } from "./parts/segmented-switch.ts";
import { TOP_BAR_TAG, TopBarElement } from "./parts/top-bar.ts";
import { installTokens } from "./tokens.ts";

const PARTS: readonly (readonly [string, CustomElementConstructor])[] = [
  [ICON_BUTTON_TAG, IconButtonElement],
  [BUTTON_TAG, ButtonElement],
  [SEGMENTED_SWITCH_TAG, SegmentedSwitchElement],
  [CONTROL_BAR_TAG, ControlBarElement],
  [SCALE_SWITCH_TAG, ScaleSwitchElement],
  [OBJECT_CARD_TAG, ObjectCardElement],
  [LAYERS_PANEL_TAG, LayersPanelElement],
  [TOP_BAR_TAG, TopBarElement],
  [READING_PAGE_TAG, ReadingPageElement],
];

/** Registers the nine tags on `registry`, each only if it is free; true if it registered at least one. */
export function defineInterface(registry: CustomElementRegistry = customElements): boolean {
  let defined = false;
  for (const [tag, element] of PARTS) {
    if (registry.get(tag) === undefined) {
      registry.define(tag, element);
      defined = true;
    }
  }
  return defined;
}

defineInterface();
if (typeof document !== "undefined") installTokens(document);
