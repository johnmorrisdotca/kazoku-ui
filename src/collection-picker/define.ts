// Importing this registers <kazoku-collection-picker>, unless the tag is already taken (the first definition wins).
import { CollectionPickerElement, TAG } from "./element.ts";

export function defineCollectionPicker(registry: CustomElementRegistry = customElements): boolean {
  if (registry.get(TAG) !== undefined) return false;
  registry.define(TAG, CollectionPickerElement);
  return true;
}

defineCollectionPicker();
