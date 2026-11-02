// Importing this registers <kazoku-save-image>, unless the tag is already taken (the first definition wins; see view-controls/define.ts for why a taken tag is left alone).
import { SaveImageElement, TAG } from "./element.ts";

export function defineSaveImage(registry: CustomElementRegistry = customElements): boolean {
  if (registry.get(TAG) !== undefined) return false;
  registry.define(TAG, SaveImageElement);
  return true;
}

defineSaveImage();
