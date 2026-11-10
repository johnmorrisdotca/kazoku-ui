// The reader's language for an element, kept the way the page-frame parts keep it: the element's own `lang`, else the nearest ancestor's, else the page's, and again when <html lang> changes.
export type Language = "en" | "ja";

/** The language to use for a `lang` value such as "ja", "ja-JP" or "en-CA": Japanese for ja, English for anything else. */
export const languageOf = (lang: string | null | undefined): Language => (/^ja\b/i.test(lang ?? "") ? "ja" : "en");

/** The language an element speaks now. */
export function languageFor(element: HTMLElement): Language {
  return languageOf(element.getAttribute("lang") ?? element.closest("[lang]")?.getAttribute("lang") ?? element.ownerDocument.documentElement.lang);
}

/** Calls `render` each time <html lang> changes; returns the function that stops. */
export function followLanguage(element: HTMLElement, render: () => void): () => void {
  const observer = new MutationObserver(render);
  observer.observe(element.ownerDocument.documentElement, { attributes: true, attributeFilter: ["lang"] });
  return () => observer.disconnect();
}
