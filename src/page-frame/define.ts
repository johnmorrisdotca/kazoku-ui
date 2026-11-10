// Importing this registers <kazoku-page-header>, <kazoku-page-credits> and <kazoku-page-footer>, unless a tag is already taken (the first definition wins; see view-controls/define.ts for why a taken tag is left alone).
import { CREDITS_TAG, PageCreditsElement, PageHeaderElement, TAG } from "./element.ts";
import { FOOTER_TAG, PageFooterElement } from "./footer.ts";

/** Registers the three tags on `registry`; true if it registered at least one. */
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
  if (registry.get(FOOTER_TAG) === undefined) {
    registry.define(FOOTER_TAG, PageFooterElement);
    defined = true;
  }
  return defined;
}

definePageFrame();
