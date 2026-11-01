// Importing this registers <kazoku-view-controls>, unless the tag is already taken.
//
// `customElements.define` throws when a name is already registered, and a page can meet that without doing anything wrong: two copies of
// this package (an app and a widget that each bundle one, or two versions), the script loaded twice, or a page that registered the tag itself
// to supply its own element. A throw here would stop the importing module, and with it the page's script. So the tag is defined only when
// nobody has, and the first definition wins; read `customElements.get("kazoku-view-controls")` to see which one that is.
import { TAG, ViewControlsElement } from "./element.ts";

export function defineViewControls(registry: CustomElementRegistry = customElements): boolean {
  if (registry.get(TAG) !== undefined) return false;
  registry.define(TAG, ViewControlsElement);
  return true;
}

defineViewControls();
