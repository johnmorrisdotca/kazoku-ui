// Importing this registers <kazoku-page-header> and <kazoku-page-credits>, unless a tag is already taken (the first definition wins; see view-controls/define.ts for why a taken tag is left alone).
import { CREDITS_TAG, PageCreditsElement, PageHeaderElement, TAG } from "./element.ts";

/** Registers both tags on `registry`; true if it registered at least one. */
export function definePageFrame(registry: CustomElementRegistry = customElements): boolean {
  let defined = false;
  if (registry.get(TAG) === undefined) {
    registry.define(TAG, PageHeaderElement);
    defined = true;
  }
  if (registry.get(CREDITS_TAG) === undefined) {
    registry.define(CREDITS_TAG, PageCreditsElement);
    defined = true;
  }
  return defined;
}

definePageFrame();
