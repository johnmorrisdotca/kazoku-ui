// The page's title and description, from the page's words: as the lines of <head> a build writes (so the built HTML carries them), and as a change in the browser when the reader changes language.
import { escapeHtml, pageTitle, pickText, type PageTexts } from "./text.ts";
import { languageOf, type Language } from "./words.ts";

/**
 * The lines of `<head>` that name the page: `<title>`, the description, and the same two for a shared link (Open Graph). Write them at build time, so the built HTML carries them
 * and a search result or a shared link reads properly before any script runs. Needs no DOM.
 *
 * @example
 * pageHeadHtml({ en: { name: "Hoshi Stars", what: "The 88 constellations", description: "A picture of each of the 88 constellations." } });
 * // <title>Hoshi Stars: The 88 constellations</title>
 * // <meta name="description" content="A picture of each of the 88 constellations." />
 * // <meta property="og:title" … /> <meta property="og:description" … />
 */
export function pageHeadHtml(texts: PageTexts, language: Language = "en"): string {
  const text = pickText(texts, language);
  const title = escapeHtml(pageTitle(text, language));
  const description = escapeHtml(text.description);
  return [`<title>${title}</title>`, `<meta name="description" content="${description}" />`, `<meta property="og:title" content="${title}" />`, `<meta property="og:description" content="${description}" />`].join("\n");
}

function setMeta(doc: Document, selector: string, make: () => HTMLMetaElement, content: string): void {
  const meta = doc.head.querySelector<HTMLMetaElement>(selector) ?? make();
  meta.setAttribute("content", content);
  if (meta.parentNode === null) doc.head.append(meta);
}

/**
 * Sets `document.title` and the description (and the Open Graph pair, when the page has them) from the page's words in `language`. Returns what it set.
 *
 * @example
 * applyPageMeta(document, TEXTS, "ja"); // document.title is now the Japanese title
 */
export function applyPageMeta(doc: Document, texts: PageTexts, language: Language): { title: string; description: string } {
  const text = pickText(texts, language);
  const title = pageTitle(text, language);
  doc.title = title;
  const make = (attribute: "name" | "property", value: string) => (): HTMLMetaElement => {
    const meta = doc.createElement("meta");
    meta.setAttribute(attribute, value);
    return meta;
  };
  if (text.description !== "") {
    setMeta(doc, 'meta[name="description"]', make("name", "description"), text.description);
    const og = doc.head.querySelector('meta[property="og:description"]');
    if (og !== null) og.setAttribute("content", text.description);
  }
  doc.head.querySelector('meta[property="og:title"]')?.setAttribute("content", title);
  return { title, description: text.description };
}

/**
 * Sets the title and description now, and again whenever the page's `lang` changes (the language picker writes it on `<html>`). Returns a function that stops watching.
 *
 * @example
 * const stop = watchPageMeta(document, TEXTS);
 */
export function watchPageMeta(doc: Document, texts: PageTexts): () => void {
  const root = doc.documentElement;
  const apply = (): void => void applyPageMeta(doc, texts, languageOf(root.getAttribute("lang")));
  apply();
  const observer = new MutationObserver(apply);
  observer.observe(root, { attributes: true, attributeFilter: ["lang"] });
  return () => observer.disconnect();
}
