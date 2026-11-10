// The interface parts' element classes and their tags, for a page that wants the class without registering it (needs a browser). `define.ts` registers them all.
export { BUTTON_TAG, ButtonElement, filledButtonCount } from "./parts/button.ts";
export { CONTROL_BAR_TAG, CONTROL_EVENT, ControlBarElement, type ControlDetail } from "./parts/control-bar.ts";
export { ICON_BUTTON_TAG, IconButtonElement } from "./parts/icon-button.ts";
export { LAYER_EVENT, LAYERS_PANEL_TAG, LayersPanelElement, type LayerChangeDetail } from "./parts/layers-panel.ts";
export { CARD_CLOSE_EVENT, OBJECT_CARD_TAG, ObjectCardElement } from "./parts/object-card.ts";
export { READING_PAGE_TAG, ReadingPageElement } from "./parts/reading-page.ts";
export { SCALE_EVENT, SCALE_SWITCH_TAG, ScaleSwitchElement, type ScaleChangeDetail } from "./parts/scale-switch.ts";
export { SEGMENT_EVENT, SEGMENTED_SWITCH_TAG, SegmentedSwitchElement, type SegmentChangeDetail } from "./parts/segmented-switch.ts";
export { TOP_BAR_EVENT, TOP_BAR_TAG, TopBarElement, type TopBarDetail } from "./parts/top-bar.ts";
export { InterfacePart } from "./part.ts";
export { CONTROL_BAR_TAG as TAG } from "./parts/control-bar.ts";
