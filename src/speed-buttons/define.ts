// Importing this registers <kazoku-speed-buttons>, unless the tag is already taken (the first definition wins; see view-controls/define.ts for why a taken tag is left alone).
import { SpeedButtonsElement, TAG } from "./element.ts";

export function defineSpeedButtons(registry: CustomElementRegistry = customElements): boolean {
  if (registry.get(TAG) !== undefined) return false;
  registry.define(TAG, SpeedButtonsElement);
  return true;
}

defineSpeedButtons();
