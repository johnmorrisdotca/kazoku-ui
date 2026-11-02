// Keeps `data-scheme="light|dark"` on an element the same as the colours the page is in: the page's forced theme (`data-theme` on <html>) or else the device's.
// An element's styles read that attribute, so it is dark in a page that forced dark on a light device. It cannot use `:host-context`, which Firefox and Safari lack.
export function watchScheme(host: HTMLElement): () => void {
  const root = host.ownerDocument.documentElement;
  const media = globalThis.matchMedia?.("(prefers-color-scheme: dark)");
  const update = (): void => {
    const forced = root.getAttribute("data-theme");
    const dark = forced === "dark" || (forced !== "light" && media?.matches === true);
    host.setAttribute("data-scheme", dark ? "dark" : "light");
  };
  update();
  const observer = new MutationObserver(update);
  observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  media?.addEventListener("change", update);
  return () => {
    observer.disconnect();
    media?.removeEventListener("change", update);
  };
}
