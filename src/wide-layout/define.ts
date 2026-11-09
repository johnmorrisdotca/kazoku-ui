// Importing this registers <kazoku-wide-toggle>, unless the tag is already taken (the first definition wins; see view-controls/define.ts for why a taken tag is left alone).
import { TAG, WideToggleElement } from "./element.ts";

export function defineWideToggle(registry: CustomElementRegistry = customElements): boolean {
  if (registry.get(TAG) !== undefined) return false;
  registry.define(TAG, WideToggleElement);
  return true;
}

defineWideToggle();
