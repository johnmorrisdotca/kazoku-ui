// The smallest parts, defined on demand: the card, the bars and the panels are built from icon buttons, buttons and the segmented switch, so each registers them (once, and only if the tag is free) when it first connects.
import { BUTTON_TAG, ButtonElement } from "./button.ts";
import { ICON_BUTTON_TAG, IconButtonElement } from "./icon-button.ts";
import { SEGMENTED_SWITCH_TAG, SegmentedSwitchElement } from "./segmented-switch.ts";

/** Registers `<kazoku-icon-button>`, `<kazoku-button>` and `<kazoku-segmented-switch>` on `registry`, leaving a taken tag alone; true if it registered at least one. */
export function defineBasics(registry: CustomElementRegistry = customElements): boolean {
  let defined = false;
  if (registry.get(ICON_BUTTON_TAG) === undefined) {
    registry.define(ICON_BUTTON_TAG, IconButtonElement);
    defined = true;
  }
  if (registry.get(BUTTON_TAG) === undefined) {
    registry.define(BUTTON_TAG, ButtonElement);
    defined = true;
  }
  if (registry.get(SEGMENTED_SWITCH_TAG) === undefined) {
    registry.define(SEGMENTED_SWITCH_TAG, SegmentedSwitchElement);
    defined = true;
  }
  return defined;
}
