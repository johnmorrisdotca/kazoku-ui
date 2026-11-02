// Importing this registers <kazoku-language-picker>, unless the tag is already taken (the first definition wins; see view-controls/define.ts for why a taken tag is left alone).
import { LanguagePickerElement, TAG } from "./element.ts";

export function defineLanguagePicker(registry: CustomElementRegistry = customElements): boolean {
  if (registry.get(TAG) !== undefined) return false;
  registry.define(TAG, LanguagePickerElement);
  return true;
}

defineLanguagePicker();
