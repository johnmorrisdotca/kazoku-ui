/** The element a part writes to, from a CSS selector: found in the part's own tree first (so it works inside a shadow root), then in the document. No selector is the page's <html>. A selector that matches nothing, or is not one, is `undefined`. */
export function resolveTarget(host: HTMLElement, selector: string | null): Element | undefined {
  if (selector === null || selector === "") return host.ownerDocument.documentElement;
  try {
    return (host.getRootNode() as Document | ShadowRoot).querySelector(selector) ?? host.ownerDocument.querySelector(selector) ?? undefined;
  } catch {
    return undefined;
  }
}
