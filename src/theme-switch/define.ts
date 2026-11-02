// Importing this registers <kazoku-theme-switch>, unless the tag is already taken (the first definition wins; see view-controls/define.ts for why a taken tag is left alone).
import { TAG, ThemeSwitchElement } from "./element.ts";

export function defineThemeSwitch(registry: CustomElementRegistry = customElements): boolean {
  if (registry.get(TAG) !== undefined) return false;
  registry.define(TAG, ThemeSwitchElement);
  return true;
}

defineThemeSwitch();
