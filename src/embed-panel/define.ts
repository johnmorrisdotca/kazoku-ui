// Importing this registers <kazoku-embed-panel>, unless the tag is already taken (the first definition wins; see view-controls/define.ts for why a taken tag is left alone).
import { EmbedPanelElement, TAG } from "./element.ts";

export function defineEmbedPanel(registry: CustomElementRegistry = customElements): boolean {
  if (registry.get(TAG) !== undefined) return false;
  registry.define(TAG, EmbedPanelElement);
  return true;
}

defineEmbedPanel();
