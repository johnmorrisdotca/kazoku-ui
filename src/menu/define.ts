// Importing this registers <kazoku-menu>, unless the tag is already taken (the first definition wins; see view-controls/define.ts for why a taken tag is left alone).
import { TAG, MenuElement } from "./element.ts";

export function defineMenu(registry: CustomElementRegistry = customElements): boolean {
  if (registry.get(TAG) !== undefined) return false;
  registry.define(TAG, MenuElement);
  return true;
}

defineMenu();
